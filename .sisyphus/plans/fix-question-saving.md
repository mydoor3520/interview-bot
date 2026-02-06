# Plan: 면접 질문 저장 버그 수정

## 요구사항 요약

면접 완료 후 히스토리 페이지에서 질문 0개, 콘텐츠 없음으로 표시되는 치명적 버그 수정.

### 근본 원인 3가지

1. **시스템 프롬프트와 질문 추출 로직의 모순**: `prompts.ts`가 AI에게 "JSON 절대 포함하지 마세요"라고 지시하지만, `stream/route.ts`는 AI 응답에서 JSON을 파싱하려 함 --> 항상 실패
2. **questionIndex가 클라이언트에서 전송되지 않음**: `useInterviewStream.ts`가 `{ sessionId, messages }`만 전송하여 서버의 `questionIndex !== undefined` 조건이 항상 false
3. **클라이언트에 질문 번호 추적 메커니즘 없음**: questionIndex를 전송하려 해도 추적할 값 자체가 없음

## 범위 및 제약조건

### 범위 내 (In Scope)
- AI 응답에서 질문 내용을 안정적으로 추출하여 DB에 저장
- 사용자 답변을 해당 질문에 연결하여 저장
- questionIndex 추적 및 전송 로직 구현
- 면접 종료 시 질문/답변 데이터가 히스토리에 정상 표시
- 기존 DB 스키마(Question, Evaluation, FollowUp 모델) 활용

### 범위 밖 (Out of Scope)
- 히스토리 페이지 UI 변경
- 평가(Evaluation) 로직 수정 (별도 이슈)
- 데이터베이스 마이그레이션 (스키마 변경 없음)
- 기존 완료된 세션 데이터 복구

### 기술 제약
- AI는 사용자에게 자연어로만 응답해야 함 (JSON이 사용자에게 보이면 안 됨)
- 스트리밍 응답 지연 최소화
- 기존 세션과의 하위 호환성 유지
- Prisma 스키마 변경 없이 구현

## 접근 방식 평가

### Option A: 서버 사이드 NLP 추출 (프롬프트 변경 없음)
- **장점**: 프롬프트 변경 불필요, 구현 간단
- **단점**: 카테고리/난이도 메타데이터 추출 불정확, 꼬리질문 vs 새 질문 구분 어려움
- **판정**: 메타데이터 정확도 부족으로 단독 사용 부적합

### Option B: 숨겨진 JSON 메타데이터 in 시스템 프롬프트
- **장점**: 정확한 메타데이터, 단일 AI 호출
- **단점**: AI가 지시를 안 따를 수 있음, 프롬프트가 복잡해짐, JSON이 스트림에 노출될 위험
- **판정**: AI 준수율 불확실로 단독 사용 위험

### Option C: Two-Pass 접근 (별도 AI 호출)
- **장점**: 가장 정확, 기존 프롬프트 변경 불필요
- **단점**: 추가 API 비용, 지연 시간
- **판정**: 정확하지만 매 응답마다 추가 AI 호출은 비용 과다

### Option D: 클라이언트 사이드 질문 감지 + 서버 저장
- **장점**: 구현 간단, 추가 AI 호출 없음
- **단점**: 비즈니스 로직이 클라이언트에 위치, 조작 가능
- **판정**: 보안 관점에서 부적합하지만 아이디어 일부 활용 가능

### Option E: 하이브리드 - 대화 분석 기반 서버 사이드 저장 (선택)
- **장점**: 프롬프트 변경 최소, 정확도 높음, 추가 AI 호출 없음
- **접근**: 서버에서 대화 흐름(메시지 역할 패턴)을 분석하여 질문/답변 쌍 자동 감지 및 저장
- **판정**: 최적의 균형

## 최종 선택: Option E 하이브리드 (대화 흐름 분석 + 경량 메타데이터 추출)

### 핵심 아이디어

AI 면접관의 모든 assistant 응답은 본질적으로 "질문"이거나 "피드백+질문"이다.
대화의 구조적 패턴을 활용하면 별도 AI 호출 없이도 질문을 안정적으로 저장할 수 있다.

**전략:**
1. 서버가 assistant 응답 완료 후 **대화 순서(메시지 인덱스)**로 질문 번호를 자동 산정
2. assistant 응답 전체를 질문 content로 저장 (AI가 자연어로 질문하므로 응답 자체가 질문)
3. 다음 user 메시지가 오면 해당 질문의 userAnswer로 업데이트
4. 카테고리/난이도는 세션의 topics/difficulty에서 가져옴 (정확한 분류는 면접 종료 시 일괄 처리 가능)

## 구현 단계

---

### Step 1: 서버 사이드 질문 자동 저장 로직 재작성

**파일**: `src/app/api/interview/stream/route.ts`
**변경 범위**: 라인 170~201 (finally 블록 내부)

**변경 내용:**
- `questionIndex`와 JSON 파싱에 의존하는 기존 로직 전면 교체
- 메시지 배열의 구조를 분석하여 현재 대화가 몇 번째 질문인지 자동 산정
- 스트리밍 완료 후 assistant 응답을 Question 레코드로 DB에 저장

**구체적 로직:**
```
1. messages 배열에서 assistant 메시지 수를 카운트하여 questionIndex 산정
   - startInterview 호출 (messages에 user 1개만): questionIndex = 0 (첫 질문)
   - sendMessage 호출: 이전 assistant 메시지 수 = 현재 questionIndex
2. fullResponse를 Question.content로 저장
3. category는 session.topics[0] 또는 "General" 사용
4. difficulty는 session.difficulty 사용
```

**의사 코드:**
```typescript
// finally 블록 내부 (라인 170 이후)
if (fullResponse) {
  void (async () => {
    try {
      // assistant 메시지 수로 질문 인덱스 산정
      const assistantCount = messages.filter(m => m.role === 'assistant').length;
      const currentQuestionIndex = assistantCount; // 현재 응답이 N번째 질문

      // 이미 같은 orderIndex의 질문이 있으면 중복 저장 방지
      const existing = await prisma.question.findFirst({
        where: { sessionId, orderIndex: currentQuestionIndex },
      });
      if (existing) return;

      // 질문 저장
      await prisma.question.create({
        data: {
          sessionId,
          orderIndex: currentQuestionIndex,
          content: fullResponse.trim(),
          category: session.topics[0] || 'General',
          difficulty: session.difficulty,
          status: 'pending',
        },
      });

      // questionCount 증가
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { questionCount: { increment: 1 } },
      });
    } catch (err) {
      console.error('Error saving question to DB:', err);
    }
  })();
}
```

---

### Step 2: 사용자 답변 저장 로직 추가

**파일**: `src/app/api/interview/stream/route.ts`
**변경 범위**: 스트리밍 시작 전 (라인 116~121 근처)

**변경 내용:**
- 사용자가 답변을 보내면 (messages 배열에 마지막이 user 메시지), 이전 질문(가장 최근 pending Question)에 userAnswer를 업데이트

**구체적 로직:**
```
1. 요청의 messages 배열에서 마지막 메시지가 user인지 확인
2. user 메시지라면 해당 세션의 가장 최근 pending Question을 찾음
3. 해당 Question의 userAnswer를 업데이트하고 status를 'answered'로 변경
```

**의사 코드:**
```typescript
// 스트리밍 시작 전, messages 분석
const lastMessage = messages[messages.length - 1];
if (lastMessage?.role === 'user' && lastMessage.content) {
  // 스킵/다음질문 요청이 아닌 일반 답변인 경우
  const isSkip = lastMessage.content.includes('[질문 스킵]');
  const isNext = lastMessage.content.includes('[다음 질문]');

  void (async () => {
    try {
      const latestQuestion = await prisma.question.findFirst({
        where: { sessionId, status: 'pending' },
        orderBy: { orderIndex: 'desc' },
      });

      if (latestQuestion) {
        if (isSkip) {
          await prisma.question.update({
            where: { id: latestQuestion.id },
            data: { status: 'skipped' },
          });
        } else if (!isNext) {
          await prisma.question.update({
            where: { id: latestQuestion.id },
            data: {
              userAnswer: lastMessage.content,
              status: 'answered',
              answeredAt: new Date(),
            },
          });
        }
      }
    } catch (err) {
      console.error('Error saving user answer to DB:', err);
    }
  })();
}
```

---

### Step 3: questionIndex 산정 방식 변경 (스키마 불필요)

**파일**: `src/app/api/interview/stream/route.ts`
**변경 범위**: 라인 10~19 (streamRequestSchema)

**변경 내용:**
- `questionIndex` 필드를 스키마에서 제거 (더 이상 클라이언트에서 전송할 필요 없음)
- 서버가 자체적으로 산정하므로 클라이언트 의존성 제거

```typescript
const streamRequestSchema = z.object({
  sessionId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().max(50000),
    })
  ).max(100),
  // questionIndex 제거 - 서버에서 자동 산정
});
```

---

### Step 4: 시스템 프롬프트 최소 수정

**파일**: `src/lib/ai/prompts.ts`
**변경 범위**: 라인 131

**변경 내용:**
- "JSON, 코드 블록, 메타데이터를 절대 포함하지 마세요" 규칙은 유지 (사용자 경험 보호)
- 변경 없음 -- 서버 사이드 추출 방식이므로 프롬프트 수정 불필요

**결정 사유**: 질문 저장이 AI 응답 포맷에 의존하지 않는 방식을 선택했으므로 프롬프트 변경이 필요 없다.

---

### Step 5: 면접 시작 시 트리거 메시지 구분

**파일**: `src/app/api/interview/stream/route.ts`

**변경 내용:**
- `startInterview()`에서 보내는 초기 메시지("면접을 시작해주세요...")는 사용자의 실제 답변이 아님
- 이 메시지를 답변으로 저장하지 않도록 분기 처리

**구체적 로직:**
```
- messages 배열이 user 메시지 1개만 포함하고 내용이 면접 시작 트리거인 경우 답변 저장 스킵
- 구분 방법: messages.length === 1 && messages[0].role === 'user'
  (시스템 프롬프트는 서버에서 추가하므로 원본 messages 기준)
```

---

### Step 6: 면접 종료 시 미저장 데이터 처리

**파일**: `src/app/api/interview/route.ts`
**변경 범위**: PUT 핸들러 (라인 126~165)

**변경 내용:**
- 면접 종료(PUT) 시 마지막 pending 질문이 있으면 status를 'unanswered'로 정리
- questionCount를 실제 DB의 Question 수로 동기화

**의사 코드:**
```typescript
// 면접 종료 시 추가 로직
// 1. 마지막 pending 질문 정리
await prisma.question.updateMany({
  where: { sessionId: id, status: 'pending' },
  data: { status: 'unanswered' },
});

// 2. questionCount 동기화
const actualCount = await prisma.question.count({
  where: { sessionId: id },
});

const session = await prisma.interviewSession.update({
  where: { id },
  data: {
    status,
    endReason,
    totalScore,
    summary,
    completedAt: new Date(),
    questionCount: actualCount,
  },
  // ...
});
```

---

### Step 7: 피드백 포함 응답에서 질문 부분 분리 (선택적 개선)

**파일**: `src/app/api/interview/stream/route.ts`

**변경 내용:**
- `evaluationMode === 'immediate'`인 경우 AI 응답이 "피드백 + 다음 질문" 형태
- 이 경우 첫 응답 이후의 assistant 메시지는 피드백+질문 복합체
- 저장 시 전체 응답을 content로 저장 (피드백 포함)
- 히스토리에서는 이것이 자연스럽게 보임 (면접관이 한 말 전체가 기록)

**결정**: 응답을 분리하지 않고 전체를 저장한다. 이유:
1. AI가 피드백과 질문을 자연스럽게 섞어서 말하므로 정확한 분리가 어려움
2. 히스토리에서 "면접관이 한 말" 전체를 보여주는 것이 맥락 파악에 더 유용
3. 평가(Evaluation)는 별도 AI 호출로 수행되므로 질문 content의 순수성은 필수가 아님

---

### Step 8: 꼬리질문(Follow-up) 감지 로직

**파일**: `src/app/api/interview/stream/route.ts`

**변경 내용:**
- 꼬리질문은 현재 단계에서는 별도 Question으로 저장 (각각 독립적인 Q&A 쌍)
- FollowUp 모델 활용은 향후 개선 사항으로 남겨둠

**이유:**
- 꼬리질문과 새 질문을 AI 호출 없이 구분하는 것은 불안정
- 각 assistant 응답을 독립 질문으로 저장하면 데이터 무결성이 보장됨
- 면접 종료 후 일괄 평가 시 AI가 꼬리질문 관계를 분석할 수 있음

---

### Step 9: 히스토리 세부 페이지 표시 확인

**파일**: `src/app/history/[sessionId]/page.tsx`

**확인 사항:**
- 히스토리 페이지는 `session.questions` 배열을 순회하여 표시 (라인 166)
- Question 모델에 데이터가 정상 저장되면 자동으로 표시됨
- 추가 변경 불필요 -- 기존 UI가 Question 데이터를 올바르게 렌더링하는 구조

---

### Step 10: 에러 핸들링 및 로깅 강화

**파일**: `src/app/api/interview/stream/route.ts`

**변경 내용:**
- 질문/답변 저장 실패 시 상세 로깅 추가
- 저장 실패가 사용자 경험에 영향을 주지 않도록 fire-and-forget 유지
- 단, 중복 저장 방지를 위한 unique 체크 추가

---

## 수정 대상 파일 요약

| 파일 | 변경 유형 | 변경 이유 |
|------|----------|----------|
| `src/app/api/interview/stream/route.ts` | **대규모 수정** | 질문/답변 자동 저장 로직 전면 재작성 |
| `src/app/api/interview/route.ts` | **소규모 수정** | PUT 핸들러에 종료 시 데이터 정리 추가 |
| `src/lib/ai/prompts.ts` | **변경 없음** | 서버 사이드 방식이므로 수정 불필요 |
| `src/hooks/useInterviewStream.ts` | **변경 없음** | questionIndex 전송 제거 (이미 안 보내고 있음) |
| `src/app/interview/[sessionId]/page.tsx` | **변경 없음** | 기존 구조 유지 |
| `src/app/history/[sessionId]/page.tsx` | **변경 없음** | Question 데이터 저장 시 자동 표시 |

## 수락 기준 (Acceptance Criteria)

- [ ] 면접 시작 시 AI의 첫 인사+질문이 Question 테이블에 orderIndex=0으로 저장된다
- [ ] 사용자가 답변을 제출하면 해당 Question의 userAnswer가 업데이트되고 status가 'answered'로 변경된다
- [ ] AI의 두 번째 이후 응답도 각각 새 Question 레코드로 저장된다
- [ ] 질문 스킵 시 해당 Question의 status가 'skipped'로 변경된다
- [ ] 면접 종료 후 히스토리 상세 페이지에서 모든 질문과 답변이 표시된다
- [ ] InterviewSession.questionCount가 실제 Question 수와 일치한다
- [ ] 질문 저장 실패가 스트리밍 응답에 영향을 주지 않는다 (fire-and-forget)
- [ ] 동일 orderIndex의 질문이 중복 저장되지 않는다
- [ ] 면접 시작 트리거 메시지("면접을 시작해주세요")가 답변으로 저장되지 않는다
- [ ] 스트리밍 성능에 체감할 수 있는 지연이 없다

## 리스크 및 대응

| 리스크 | 발생 확률 | 영향도 | 대응 |
|--------|----------|--------|------|
| 동시 요청으로 인한 중복 질문 저장 | 낮음 | 중간 | `findFirst` + unique 체크로 방지, DB unique constraint 검토 |
| 메시지 배열 순서가 꼬이는 경우 | 낮음 | 높음 | assistant 메시지 카운트 기반이므로 순서 의존성 최소화 |
| 빈 assistant 응답 (에러 시) | 중간 | 낮음 | `fullResponse` 길이 체크 후 저장 |
| 매우 긴 AI 응답이 DB에 저장 실패 | 낮음 | 중간 | content 필드가 String (TEXT)이므로 길이 제한 없음 |
| 면접 도중 브라우저 새로고침 | 중간 | 높음 | 이미 저장된 질문은 보존됨, 클라이언트 메시지 상태는 손실 (기존과 동일) |
| startInterview 재호출로 인한 중복 첫 질문 | 중간 | 중간 | orderIndex 기반 중복 체크로 방지 |

## 검증 단계

### 1. 단위 테스트
- [ ] `stream/route.ts`의 질문 저장 로직: 모의 메시지 배열로 올바른 questionIndex 산정 확인
- [ ] 답변 저장 로직: user 메시지 도착 시 최근 pending Question 업데이트 확인
- [ ] 스킵 처리: `[질문 스킵]` 메시지 시 status 변경 확인

### 2. 통합 테스트
- [ ] 면접 시작 -> 질문 1개 저장 확인 (DB 조회)
- [ ] 답변 제출 -> userAnswer 저장 확인
- [ ] 3~5번 왕복 -> 모든 질문/답변 쌍 저장 확인
- [ ] 면접 종료 -> questionCount 동기화 확인

### 3. E2E 테스트 (Playwright)
- [ ] 전체 면접 시나리오: 시작 -> 3개 질문 답변 -> 1개 스킵 -> 종료
- [ ] 히스토리 페이지에서 4개 질문 표시 확인
- [ ] 각 질문의 content, userAnswer, status 값 확인

### 4. 수동 검증
- [ ] 실제 AI와 면접 진행 후 히스토리 페이지 확인
- [ ] DB에서 직접 Question 테이블 조회하여 데이터 정합성 확인
- [ ] 브라우저 개발자 도구 Network 탭에서 API 호출 확인
- [ ] 스트리밍 응답 속도가 기존과 동일한지 체감 확인

### 5. 엣지 케이스 검증
- [ ] 매우 빠르게 연속 답변 제출 시 데이터 정합성
- [ ] 면접 도중 네트워크 에러 발생 시 저장된 데이터 보존 확인
- [ ] 빈 답변 제출 시 처리 확인
- [ ] 같은 세션에서 startInterview 두 번 호출 시 중복 방지 확인

## 향후 개선 사항 (이번 범위 밖)

1. **꼬리질문 분류**: 면접 종료 시 AI 일괄 분석으로 메인 질문/꼬리질문 분류 -> FollowUp 모델 활용
2. **질문별 카테고리 분류**: 면접 종료 시 각 질문을 topics 중 정확한 카테고리로 분류
3. **실시간 질문 카운터**: 면접 진행 중 UI에 실제 저장된 질문 수 표시
4. **세션 재개**: 브라우저 새로고침 시 저장된 질문/답변으로 대화 복원
5. **DB unique constraint**: `@@unique([sessionId, orderIndex])` 추가 마이그레이션
