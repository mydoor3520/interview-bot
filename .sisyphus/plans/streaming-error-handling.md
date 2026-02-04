# 스트리밍 응답 처리 및 에러 핸들링 상세 설계

## 개요

이 문서는 AI 모의 면접 웹 애플리케이션에서 claude-max-api-proxy(localhost:3456, OpenAI 호환 API)를 통한
스트리밍 응답 처리와 통합 에러 처리 전략을 정의한다.

**적용 범위:**
- 서버 측: Next.js API Route에서 프록시 호출 및 SSE 파싱
- 클라이언트 측: React Hook 기반 스트리밍 수신 및 UI 업데이트
- 에러 핸들링: 전 계층(네트워크/서버/클라이언트) 통합 전략
- 복원력: 재시도, 부분 응답 저장, 세션 복원

---

## 1. SSE 스트리밍 파싱 상세 로직

### 1.1 서버 측 (Next.js API Route)

#### 전체 흐름

```
클라이언트 POST 요청
  -> 인증 검증
  -> DB에서 세션/대화 히스토리 로드
  -> 시스템 프롬프트 구성 (프로필 컨텍스트 포함)
  -> claude-max-api-proxy에 스트리밍 요청
  -> SSE 응답 파싱
  -> ReadableStream으로 클라이언트에 전달
  -> 스트리밍 완료 후 DB에 응답 저장
```

#### 상세 의사코드

```typescript
// app/api/interview/stream/route.ts

import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { AI_PROXY_URL, AI_MODEL } from "@/lib/ai/config";

// ─── 에러 코드 상수 ───
const ERROR_CODES = {
  AUTH_FAILED: "AUTH_FAILED",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  PROFILE_NOT_FOUND: "PROFILE_NOT_FOUND",
  PROXY_UNAVAILABLE: "PROXY_UNAVAILABLE",
  STREAM_ERROR: "STREAM_ERROR",
  TIMEOUT: "TIMEOUT",
  CONTEXT_OVERFLOW: "CONTEXT_OVERFLOW",
  RATE_LIMITED: "RATE_LIMITED",
  DB_ERROR: "DB_ERROR",
} as const;

// ─── 요청 스키마 ───
interface StreamRequest {
  sessionId: string;
  userMessage: string;
  action: "question" | "evaluate" | "follow_up" | "summary";
}

export async function POST(req: NextRequest) {
  // ─── 1단계: 인증 검증 ───
  const authResult = await verifyAuth(req);
  if (!authResult.success) {
    return Response.json(
      { error: "Unauthorized", code: ERROR_CODES.AUTH_FAILED },
      { status: 401 }
    );
  }

  // ─── 2단계: 요청 파싱 및 검증 ───
  let body: StreamRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { sessionId, userMessage, action } = body;

  if (!sessionId || !action) {
    return Response.json(
      { error: "Missing required fields: sessionId, action" },
      { status: 400 }
    );
  }

  // ─── 3단계: DB에서 세션 및 대화 히스토리 로드 ───
  let session;
  let profile;
  try {
    [session, profile] = await Promise.all([
      prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: {
          questions: {
            include: { evaluation: true, followUps: true },
            orderBy: { orderIndex: "asc" },
          },
          targetPosition: true,
        },
      }),
      prisma.userProfile.findFirst({
        include: {
          skills: true,
          experiences: { orderBy: { orderIndex: "asc" } },
          targetPositions: true,
        },
      }),
    ]);
  } catch (dbError) {
    console.error("[STREAM] DB query failed:", dbError);
    return Response.json(
      { error: "Database connection failed", code: ERROR_CODES.DB_ERROR },
      { status: 503 }
    );
  }

  if (!session) {
    return Response.json(
      { error: "Session not found", code: ERROR_CODES.SESSION_NOT_FOUND },
      { status: 404 }
    );
  }

  if (!profile) {
    return Response.json(
      { error: "Profile not configured", code: ERROR_CODES.PROFILE_NOT_FOUND },
      { status: 400 }
    );
  }

  // ─── 4단계: 메시지 배열 구성 ───
  const systemPrompt = buildSystemPrompt({
    profile,
    session,
    action,
  });

  const messages = buildMessageHistory(session, userMessage, action);

  // ─── 5단계: claude-max-api-proxy에 스트리밍 요청 ───
  const proxyUrl = `${AI_PROXY_URL}/v1/chat/completions`;

  let proxyResponse: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30초 타임아웃

    proxyResponse = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // claude-max-api-proxy는 인증 불필요 (로컬 전용)
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (fetchError: any) {
    // ─── 네트워크 에러 분류 ───
    if (fetchError.name === "AbortError") {
      console.error("[STREAM] Proxy request timed out (30s)");
      return Response.json(
        { error: "AI proxy request timed out", code: ERROR_CODES.TIMEOUT },
        { status: 504 }
      );
    }

    if (fetchError.cause?.code === "ECONNREFUSED") {
      console.error("[STREAM] Proxy server unreachable:", proxyUrl);
      return Response.json(
        { error: "AI proxy server is not running", code: ERROR_CODES.PROXY_UNAVAILABLE },
        { status: 503 }
      );
    }

    console.error("[STREAM] Proxy fetch failed:", fetchError);
    return Response.json(
      { error: "Failed to connect to AI proxy", code: ERROR_CODES.PROXY_UNAVAILABLE },
      { status: 503 }
    );
  }

  // ─── 6단계: 프록시 응답 상태 확인 ───
  if (!proxyResponse.ok) {
    const statusHandlers: Record<number, () => Response> = {
      401: () =>
        Response.json(
          { error: "AI proxy authentication failed", code: ERROR_CODES.AUTH_FAILED },
          { status: 502 }
        ),
      429: () =>
        Response.json(
          { error: "Rate limited by AI provider", code: ERROR_CODES.RATE_LIMITED },
          { status: 429 }
        ),
      400: () => {
        // 컨텍스트 윈도우 초과는 보통 400으로 반환
        return Response.json(
          { error: "Context window exceeded", code: ERROR_CODES.CONTEXT_OVERFLOW },
          { status: 400 }
        );
      },
    };

    const handler = statusHandlers[proxyResponse.status];
    if (handler) return handler();

    const errorBody = await proxyResponse.text().catch(() => "Unknown error");
    console.error(`[STREAM] Proxy returned ${proxyResponse.status}:`, errorBody);
    return Response.json(
      { error: "AI proxy error", code: ERROR_CODES.STREAM_ERROR },
      { status: 502 }
    );
  }

  // ─── 7단계: SSE 스트리밍 파싱 및 클라이언트 전달 ───
  const proxyBody = proxyResponse.body;
  if (!proxyBody) {
    return Response.json(
      { error: "Empty response from AI proxy", code: ERROR_CODES.STREAM_ERROR },
      { status: 502 }
    );
  }

  let fullContent = ""; // 전체 응답 누적 (DB 저장용)

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      // 청크를 그대로 전달 (SSE 포맷 유지)
      controller.enqueue(chunk);
    },
  });

  // SSE 파싱 및 콘텐츠 누적을 위한 별도 스트림
  const reader = proxyBody.getReader();
  const decoder = new TextDecoder();
  let buffer = ""; // 불완전한 라인 버퍼

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // 스트림 정상 종료 -> DB에 저장
            await saveCompletedResponse(sessionId, fullContent, action);
            controller.close();
            break;
          }

          const text = decoder.decode(value, { stream: true });
          buffer += text;

          // SSE 라인 단위 파싱
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // 마지막 불완전한 라인은 버퍼에 유지

          for (const line of lines) {
            const trimmed = line.trim();

            // 빈 줄 무시 (SSE 이벤트 구분자)
            if (trimmed === "") continue;

            // 종료 신호
            if (trimmed === "data: [DONE]") {
              // 클라이언트에 종료 신호 전달
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              await saveCompletedResponse(sessionId, fullContent, action);
              controller.close();
              return;
            }

            // SSE 데이터 라인 파싱
            if (trimmed.startsWith("data: ")) {
              const jsonStr = trimmed.slice(6); // "data: " 제거

              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;

                if (delta) {
                  fullContent += delta; // 전체 콘텐츠 누적
                }

                // 원본 SSE 포맷 그대로 클라이언트에 전달
                controller.enqueue(encoder.encode(`data: ${jsonStr}\n\n`));
              } catch (parseError) {
                // JSON 파싱 실패 -> 불완전한 청크일 수 있음
                // 로그 남기고 건너뜀 (다음 청크와 합쳐질 수 있음)
                console.warn("[STREAM] JSON parse error in SSE chunk:", jsonStr);
              }
            }
          }
        }
      } catch (streamError: any) {
        console.error("[STREAM] Stream reading error:", streamError);

        // 부분 응답이 있으면 저장
        if (fullContent.length > 0) {
          await savePartialResponse(sessionId, fullContent, action);
        }

        // 클라이언트에 에러 이벤트 전달
        const errorEvent = JSON.stringify({
          error: true,
          code: ERROR_CODES.STREAM_ERROR,
          message: "Stream interrupted",
          partialContent: fullContent.length > 0,
        });
        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
        controller.close();
      }
    },
  });

  // ─── 8단계: 스트리밍 응답 반환 ───
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// ─── 헬퍼: 메시지 히스토리 구성 ───
function buildMessageHistory(
  session: InterviewSessionWithRelations,
  userMessage: string,
  action: string
): Array<{ role: "user" | "assistant"; content: string }> {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  // 기존 Q&A를 대화 히스토리로 변환
  for (const question of session.questions) {
    // AI 질문
    messages.push({ role: "assistant", content: question.content });

    // 사용자 답변
    if (question.userAnswer) {
      messages.push({ role: "user", content: question.userAnswer });
    }

    // 평가 (즉시 평가 모드)
    if (question.evaluation) {
      messages.push({
        role: "assistant",
        content: formatEvaluation(question.evaluation),
      });
    }

    // 꼬리질문
    for (const followUp of question.followUps) {
      messages.push({ role: "assistant", content: followUp.content });
      if (followUp.userAnswer) {
        messages.push({ role: "user", content: followUp.userAnswer });
      }
    }
  }

  // 현재 사용자 메시지 추가
  if (userMessage) {
    messages.push({ role: "user", content: userMessage });
  }

  return messages;
}

// ─── 헬퍼: 완료된 응답 DB 저장 ───
async function saveCompletedResponse(
  sessionId: string,
  content: string,
  action: string
): Promise<void> {
  try {
    // action에 따라 적절한 테이블에 저장
    switch (action) {
      case "question":
        await prisma.question.create({
          data: {
            sessionId,
            content,
            category: "generated", // AI가 분류
            difficulty: "auto",
            orderIndex: await getNextQuestionIndex(sessionId),
          },
        });
        break;

      case "evaluate":
        // 평가 결과를 파싱하여 저장 (AI 응답이 JSON 포맷)
        await saveEvaluation(sessionId, content);
        break;

      case "follow_up":
        await saveFollowUp(sessionId, content);
        break;

      case "summary":
        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: { summary: content, status: "completed", completedAt: new Date() },
        });
        break;
    }
  } catch (dbError) {
    console.error("[STREAM] Failed to save completed response:", dbError);
    // DB 저장 실패해도 스트리밍 자체는 이미 완료
    // localStorage 복구를 위해 클라이언트에서 처리
  }
}

// ─── 헬퍼: 부분 응답 저장 (스트림 중단 시) ───
async function savePartialResponse(
  sessionId: string,
  partialContent: string,
  action: string
): Promise<void> {
  try {
    // 마지막 완전한 문장까지만 저장
    const lastSentenceEnd = Math.max(
      partialContent.lastIndexOf("。"),
      partialContent.lastIndexOf("."),
      partialContent.lastIndexOf("!"),
      partialContent.lastIndexOf("?"),
      partialContent.lastIndexOf("\n")
    );

    const safeContent =
      lastSentenceEnd > 0
        ? partialContent.slice(0, lastSentenceEnd + 1)
        : partialContent;

    console.warn(
      `[STREAM] Saving partial response: ${safeContent.length}/${partialContent.length} chars`
    );

    // 부분 응답임을 표시하여 저장
    await prisma.question.create({
      data: {
        sessionId,
        content: safeContent + "\n\n[응답이 중단되었습니다]",
        category: "generated",
        difficulty: "auto",
        orderIndex: await getNextQuestionIndex(sessionId),
      },
    });
  } catch (dbError) {
    console.error("[STREAM] Failed to save partial response:", dbError);
  }
}
```

#### SSE 포맷 참조

claude-max-api-proxy가 반환하는 OpenAI 호환 SSE 포맷은 다음과 같다.

```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"claude-sonnet-4","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"claude-sonnet-4","choices":[{"index":0,"delta":{"content":"안녕"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"claude-sonnet-4","choices":[{"index":0,"delta":{"content":"하세요"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"claude-sonnet-4","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

각 라인의 구조:
- `data: ` 접두사 + JSON 문자열
- 각 이벤트는 `\n\n`으로 구분
- `choices[0].delta.content`에 텍스트 조각이 들어있음
- `finish_reason`이 `"stop"`이면 생성 완료
- 마지막에 `data: [DONE]` 종료 신호

---

### 1.2 클라이언트 측 (React Hook)

#### 상태 머신

```
                       ┌──────────────────────┐
                       │                      │
        fetch 시작     │                      │  사용자 취소
  idle ──────────► streaming ──────────► complete
   │                   │                      │
   │                   │  에러 발생            │
   │                   └────────► error ◄─────┘
   │                                │
   └────────────────────────────────┘
              reset / 재시도
```

**상태 정의:**
- `idle`: 초기 상태. 스트리밍 미시작
- `streaming`: SSE 수신 중. 실시간으로 콘텐츠 업데이트
- `complete`: 스트리밍 정상 완료. 전체 응답 수신됨
- `error`: 에러 발생. 에러 정보와 부분 응답 보유

#### 상세 의사코드

```typescript
// hooks/useInterviewStream.ts

import { useState, useRef, useCallback, useEffect } from "react";

// ─── 타입 정의 ───
type StreamStatus = "idle" | "streaming" | "complete" | "error";

interface StreamError {
  code: string;
  message: string;
  retryable: boolean;
  statusCode?: number;
}

interface UseInterviewStreamOptions {
  onChunk?: (chunk: string) => void;         // 각 청크 수신 시 콜백
  onComplete?: (fullContent: string) => void; // 스트리밍 완료 시 콜백
  onError?: (error: StreamError) => void;     // 에러 발생 시 콜백
  enableTypingEffect?: boolean;               // 타이핑 효과 활성화 (기본: true)
  typingSpeed?: number;                       // 타이핑 속도 (ms/char, 기본: 15)
  autoSaveInterval?: number;                  // localStorage 임시 저장 간격 (ms, 기본: 5000)
}

interface UseInterviewStreamReturn {
  // 상태
  status: StreamStatus;
  content: string;           // 현재까지 표시된 콘텐츠
  displayContent: string;    // 타이핑 효과 적용된 표시 콘텐츠
  error: StreamError | null;
  isStreaming: boolean;

  // 액션
  startStream: (params: StreamParams) => Promise<void>;
  cancelStream: () => void;
  retry: () => Promise<void>;
  reset: () => void;
}

interface StreamParams {
  sessionId: string;
  userMessage: string;
  action: "question" | "evaluate" | "follow_up" | "summary";
}

// ─── 재시도 가능 에러 판별 ───
const RETRYABLE_ERROR_CODES = new Set([
  "PROXY_UNAVAILABLE",
  "TIMEOUT",
  "STREAM_ERROR",
  "RATE_LIMITED",
  "DB_ERROR",
]);

function isRetryableError(code: string): boolean {
  return RETRYABLE_ERROR_CODES.has(code);
}

// ─── 메인 훅 ───
export function useInterviewStream(
  options: UseInterviewStreamOptions = {}
): UseInterviewStreamReturn {
  const {
    onChunk,
    onComplete,
    onError,
    enableTypingEffect = true,
    typingSpeed = 15,
    autoSaveInterval = 5000,
  } = options;

  // ─── 상태 ───
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [content, setContent] = useState("");           // 수신된 전체 콘텐츠
  const [displayContent, setDisplayContent] = useState(""); // 화면에 표시 중인 콘텐츠
  const [error, setError] = useState<StreamError | null>(null);

  // ─── Refs (렌더링과 무관한 값) ───
  const abortControllerRef = useRef<AbortController | null>(null);
  const contentBufferRef = useRef(""); // 수신된 전체 텍스트 (동기 접근용)
  const displayIndexRef = useRef(0);   // 타이핑 효과에서 현재 표시 위치
  const rafIdRef = useRef<number | null>(null);
  const lastParamsRef = useRef<StreamParams | null>(null);
  const retryCountRef = useRef(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const userScrolledUpRef = useRef(false);

  // ─── localStorage 임시 저장 ───
  const startAutoSave = useCallback(
    (sessionId: string) => {
      autoSaveTimerRef.current = setInterval(() => {
        if (contentBufferRef.current.length > 0) {
          try {
            localStorage.setItem(
              `interview_draft_${sessionId}`,
              JSON.stringify({
                content: contentBufferRef.current,
                timestamp: Date.now(),
                status: "streaming",
              })
            );
          } catch {
            // localStorage 용량 초과 등 무시
          }
        }
      }, autoSaveInterval);
    },
    [autoSaveInterval]
  );

  const stopAutoSave = useCallback((sessionId?: string) => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    // 완료 시 임시 저장 제거
    if (sessionId) {
      try {
        localStorage.removeItem(`interview_draft_${sessionId}`);
      } catch {
        // 무시
      }
    }
  }, []);

  // ─── 타이핑 효과 (requestAnimationFrame 기반) ───
  const startTypingEffect = useCallback(() => {
    if (!enableTypingEffect) {
      // 타이핑 효과 비활성화 시 즉시 반영
      setDisplayContent(contentBufferRef.current);
      return;
    }

    let lastTimestamp = 0;

    const animate = (timestamp: number) => {
      // typingSpeed ms마다 한 글자씩 표시
      if (timestamp - lastTimestamp >= typingSpeed) {
        lastTimestamp = timestamp;

        const currentBuffer = contentBufferRef.current;
        if (displayIndexRef.current < currentBuffer.length) {
          // 한번에 여러 글자씩 표시 (밀린 분량 처리)
          const charsToShow = Math.min(
            Math.ceil((timestamp - lastTimestamp) / typingSpeed) + 1,
            currentBuffer.length - displayIndexRef.current
          );

          displayIndexRef.current += charsToShow;
          setDisplayContent(currentBuffer.slice(0, displayIndexRef.current));

          // 자동 스크롤 (사용자가 위로 스크롤하지 않았을 때만)
          if (!userScrolledUpRef.current) {
            requestAutoScroll();
          }
        }
      }

      // 아직 표시할 콘텐츠가 남아있거나 스트리밍 중이면 계속
      if (
        displayIndexRef.current < contentBufferRef.current.length ||
        status === "streaming"
      ) {
        rafIdRef.current = requestAnimationFrame(animate);
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);
  }, [enableTypingEffect, typingSpeed, status]);

  // ─── 자동 스크롤 ───
  const requestAutoScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 컨테이너 하단에서 100px 이내에 있을 때만 자동 스크롤
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom && !userScrolledUpRef.current) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  // ─── 스크롤 이벤트 감지 (사용자 수동 스크롤 여부) ───
  const handleScroll = useCallback((e: Event) => {
    const container = e.target as HTMLElement;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    // 하단에서 멀어지면 사용자가 스크롤 올린 것으로 판단
    userScrolledUpRef.current = !isNearBottom;
  }, []);

  // ─── 메인 스트리밍 함수 ───
  const startStream = useCallback(
    async (params: StreamParams) => {
      // 이전 스트림 정리
      cancelStream();

      // 상태 초기화
      setStatus("streaming");
      setContent("");
      setDisplayContent("");
      setError(null);
      contentBufferRef.current = "";
      displayIndexRef.current = 0;
      userScrolledUpRef.current = false;
      lastParamsRef.current = params;

      // AbortController 생성
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // localStorage 임시 저장 시작
      startAutoSave(params.sessionId);

      // 타이핑 효과 시작
      startTypingEffect();

      try {
        // ─── fetch 요청 ───
        const response = await fetch("/api/interview/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
          signal: abortController.signal,
        });

        // ─── HTTP 에러 처리 ───
        if (!response.ok) {
          let errorData: any;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: "Unknown server error", code: "UNKNOWN" };
          }

          const streamError: StreamError = {
            code: errorData.code || "UNKNOWN",
            message: errorData.error || `Server error (${response.status})`,
            retryable: isRetryableError(errorData.code),
            statusCode: response.status,
          };

          setError(streamError);
          setStatus("error");
          onError?.(streamError);
          stopAutoSave();
          return;
        }

        // ─── ReadableStream 수신 ───
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder();
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // 스트림 정상 종료
            setContent(contentBufferRef.current);
            setStatus("complete");
            retryCountRef.current = 0; // 재시도 카운터 초기화
            onComplete?.(contentBufferRef.current);
            stopAutoSave(params.sessionId);
            break;
          }

          // 바이트 -> 문자열 디코딩
          const text = decoder.decode(value, { stream: true });
          sseBuffer += text;

          // SSE 라인 파싱
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === "" || trimmed.startsWith(":")) continue;

            // 종료 신호
            if (trimmed === "data: [DONE]") {
              setContent(contentBufferRef.current);

              // 타이핑 효과가 아직 진행 중이면 완료될 때까지 대기
              if (enableTypingEffect) {
                // displayIndex가 buffer를 따라잡을 때까지 RAF 유지
                await waitForTypingComplete();
              }

              setStatus("complete");
              retryCountRef.current = 0;
              onComplete?.(contentBufferRef.current);
              stopAutoSave(params.sessionId);
              return;
            }

            // 데이터 파싱
            if (trimmed.startsWith("data: ")) {
              const jsonStr = trimmed.slice(6);

              try {
                const parsed = JSON.parse(jsonStr);

                // 에러 이벤트 처리 (서버에서 보낸 에러)
                if (parsed.error) {
                  const streamError: StreamError = {
                    code: parsed.code || "STREAM_ERROR",
                    message: parsed.message || "Stream error",
                    retryable: isRetryableError(parsed.code),
                  };
                  setError(streamError);
                  setStatus("error");
                  onError?.(streamError);
                  stopAutoSave();
                  return;
                }

                // 정상 콘텐츠 추출
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  contentBufferRef.current += delta;
                  setContent(contentBufferRef.current);
                  onChunk?.(delta);

                  // 타이핑 효과 비활성화 시 즉시 표시 갱신
                  if (!enableTypingEffect) {
                    setDisplayContent(contentBufferRef.current);
                    requestAutoScroll();
                  }
                }
              } catch (parseError) {
                // JSON 파싱 실패 -> 건너뜀 (불완전한 청크)
                console.warn(
                  "[useInterviewStream] SSE JSON parse error:",
                  jsonStr
                );
              }
            }
          }
        }
      } catch (fetchError: any) {
        if (fetchError.name === "AbortError") {
          // 사용자 취소 -> 에러가 아닌 정상 처리
          setStatus("idle");
          stopAutoSave();
          return;
        }

        // 네트워크 에러
        const streamError: StreamError = {
          code: "NETWORK_ERROR",
          message: navigator.onLine
            ? "Failed to connect to server"
            : "No internet connection",
          retryable: true,
        };

        setError(streamError);
        setStatus("error");
        onError?.(streamError);
        stopAutoSave();
      }
    },
    [
      onChunk,
      onComplete,
      onError,
      enableTypingEffect,
      startAutoSave,
      stopAutoSave,
      startTypingEffect,
      requestAutoScroll,
    ]
  );

  // ─── 스트리밍 취소 ───
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    stopAutoSave();
  }, [stopAutoSave]);

  // ─── 재시도 ───
  const retry = useCallback(async () => {
    if (!lastParamsRef.current) return;

    const maxRetries = 3;
    if (retryCountRef.current >= maxRetries) {
      setError({
        code: "MAX_RETRIES_EXCEEDED",
        message: `Maximum retry attempts (${maxRetries}) exceeded`,
        retryable: false,
      });
      return;
    }

    retryCountRef.current += 1;
    const backoffMs = Math.pow(2, retryCountRef.current - 1) * 1000;
    // 1s, 2s, 4s

    // 백오프 대기
    await new Promise((resolve) => setTimeout(resolve, backoffMs));

    // 재시도
    await startStream(lastParamsRef.current);
  }, [startStream]);

  // ─── 상태 초기화 ───
  const reset = useCallback(() => {
    cancelStream();
    setStatus("idle");
    setContent("");
    setDisplayContent("");
    setError(null);
    contentBufferRef.current = "";
    displayIndexRef.current = 0;
    retryCountRef.current = 0;
  }, [cancelStream]);

  // ─── 타이핑 완료 대기 헬퍼 ───
  const waitForTypingComplete = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const check = () => {
        if (displayIndexRef.current >= contentBufferRef.current.length) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }, []);

  // ─── cleanup ───
  useEffect(() => {
    return () => {
      cancelStream();
    };
  }, [cancelStream]);

  return {
    status,
    content,
    displayContent,
    error,
    isStreaming: status === "streaming",
    startStream,
    cancelStream,
    retry,
    reset,
  };
}
```

#### 타이핑 효과 동작 원리

```
시간 →

수신 버퍼:  [안][녕][하][세][요][,][ ][면][접]...
              ↑ contentBufferRef.current

표시 커서:  [안][녕][하]
              ↑ displayIndexRef.current

requestAnimationFrame 루프:
  - 매 프레임마다 typingSpeed(15ms) 간격으로 displayIndex 증가
  - displayContent = buffer.slice(0, displayIndex)
  - 버퍼가 커서보다 항상 앞서 있으므로 자연스러운 타이핑 효과
  - 스트리밍이 빨라도 커서가 천천히 따라감
  - 스트리밍 완료 후에도 커서가 끝까지 도달할 때까지 애니메이션 유지
```

#### 자동 스크롤 조건

| 조건 | 동작 |
|------|------|
| 사용자가 채팅 영역 하단 100px 이내에 있음 | 자동 스크롤 활성 |
| 사용자가 위로 스크롤하여 하단에서 100px 이상 벗어남 | 자동 스크롤 비활성 |
| 사용자가 다시 하단으로 스크롤 | 자동 스크롤 재활성 |
| 새 메시지 시작 (startStream 호출) | 자동 스크롤 초기화 (활성) |

---

## 2. 에러 핸들링 시나리오별 대응 테이블

### 2.1 전체 에러 시나리오

| 에러 유형 | 감지 방법 | HTTP 상태 | 에러 코드 | 사용자 메시지 | 복구 동작 | 재시도 가능 |
|-----------|----------|-----------|-----------|-------------|----------|------------|
| 프록시 서버 다운 (ECONNREFUSED) | `fetch` catch에서 `cause.code === 'ECONNREFUSED'` | 503 | `PROXY_UNAVAILABLE` | "AI 서버에 연결할 수 없습니다. 프록시 서버(localhost:3456)가 실행 중인지 확인해주세요." | Alert Dialog 표시. 헬스체크 API로 상태 재확인 버튼 제공 | Yes (수동) |
| 응답 타임아웃 (30초 이상) | `AbortController` + `setTimeout(30000)` | 504 | `TIMEOUT` | "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요." | 자동 재시도 (exponential backoff). 3회 실패 시 수동 재시도 버튼 | Yes |
| 컨텍스트 윈도우 초과 | 프록시 400 응답 + 에러 메시지 파싱 | 400 | `CONTEXT_OVERFLOW` | "대화가 너무 길어 AI가 처리할 수 없습니다. 면접을 종료하고 새 세션을 시작해주세요." | 세션 종료 + 새 세션 시작 버튼 제공. 현재까지의 대화 저장 | No |
| 스트림 중단 (예상치 못한 연결 끊김) | `reader.read()`에서 예외 또는 예상 외 `done` | - | `STREAM_ERROR` | "응답 수신 중 연결이 끊어졌습니다. 수신된 내용까지 저장되었습니다." | 부분 응답 DB + localStorage 저장. 재시도 버튼 | Yes |
| JSON 파싱 실패 (불완전한 청크) | `JSON.parse()` catch | - | (내부 처리) | (사용자에게 표시하지 않음 - 내부적으로 건너뜀) | 경고 로그 기록. 다음 청크에서 정상 파싱 시도. 연속 10회 실패 시 스트림 에러로 전환 | N/A |
| Rate Limiting (429) | 프록시 응답 상태 코드 429 | 429 | `RATE_LIMITED` | "요청이 너무 많습니다. {retryAfter}초 후 자동으로 재시도합니다." | `Retry-After` 헤더 확인. 자동 대기 후 재시도 | Yes |
| 인증 실패 (401) | API Route에서 JWT 검증 실패 | 401 | `AUTH_FAILED` | "인증이 만료되었습니다. 다시 로그인해주세요." | 로그인 페이지로 리다이렉트. 현재 대화 localStorage에 임시 저장 | No |
| DB 연결 실패 | Prisma 쿼리에서 예외 | 503 | `DB_ERROR` | "데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요." | Toast 표시 + 재시도 버튼. 스트리밍 자체는 가능하되 저장만 실패한 경우 localStorage에 보관 | Yes |
| 폼 유효성 검증 실패 | Zod 스키마 검증 | 400 | `VALIDATION_ERROR` | (필드별 인라인 에러 메시지) | Inline Error 표시. 해당 필드로 포커스 이동 | No (수정 필요) |
| 프로필 미설정 상태에서 면접 시작 시도 | API Route에서 프로필 존재 여부 확인 | 400 | `PROFILE_NOT_FOUND` | "면접을 시작하려면 먼저 프로필을 설정해주세요." | 프로필 온보딩 페이지로 리다이렉트 버튼 제공 | No (설정 필요) |
| 네트워크 오프라인 | `navigator.onLine === false` 또는 fetch 실패 | - | `NETWORK_ERROR` | "인터넷 연결이 끊어졌습니다. 네트워크를 확인해주세요." | `online` 이벤트 리스너로 복구 감지. 복구 시 자동 재시도 | Yes (자동) |
| 프록시 인증 실패 (401 from proxy) | 프록시 응답 상태 코드 401 | 502 | `AUTH_FAILED` | "AI 서비스 인증에 실패했습니다. 프록시 서버 설정을 확인해주세요." | Alert Dialog 표시. 관리자 조치 필요 안내 | No |
| 알 수 없는 서버 에러 (500) | API Route 내부 예외 | 500 | `INTERNAL_ERROR` | "서버에서 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요." | Toast + 재시도 버튼 | Yes |

### 2.2 에러 코드 상수

```typescript
// lib/errors/codes.ts

export const ERROR_CODES = {
  // 인증 관련
  AUTH_FAILED: "AUTH_FAILED",

  // 세션/프로필 관련
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  PROFILE_NOT_FOUND: "PROFILE_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // AI 프록시 관련
  PROXY_UNAVAILABLE: "PROXY_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  CONTEXT_OVERFLOW: "CONTEXT_OVERFLOW",
  RATE_LIMITED: "RATE_LIMITED",
  STREAM_ERROR: "STREAM_ERROR",

  // 인프라 관련
  DB_ERROR: "DB_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",

  // 재시도 관련
  MAX_RETRIES_EXCEEDED: "MAX_RETRIES_EXCEEDED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
```

---

## 3. 재시도 로직

### 3.1 설계 원칙

```
최대 재시도 횟수:  3회
백오프 전략:       Exponential backoff (지수 백오프)
백오프 계산:       delay = 2^(attempt - 1) * 1000ms
                   1회차: 1초, 2회차: 2초, 3회차: 4초
최대 대기:         4초 (3회차)
총 최대 대기:      7초 (1 + 2 + 4)
```

### 3.2 재시도 가능/불가능 에러 분류

| 분류 | 에러 코드 | 이유 |
|------|----------|------|
| **재시도 가능** | `PROXY_UNAVAILABLE` | 프록시 서버가 재시작 중일 수 있음 |
| **재시도 가능** | `TIMEOUT` | 일시적 부하로 인한 지연 |
| **재시도 가능** | `STREAM_ERROR` | 네트워크 불안정으로 인한 일시적 끊김 |
| **재시도 가능** | `RATE_LIMITED` | 일정 시간 후 요청 가능 |
| **재시도 가능** | `DB_ERROR` | 일시적 DB 연결 풀 소진 등 |
| **재시도 가능** | `NETWORK_ERROR` | 네트워크 복구 가능 |
| **재시도 가능** | `INTERNAL_ERROR` | 일시적 서버 오류 |
| **재시도 불가** | `AUTH_FAILED` | 인증 정보 자체가 잘못됨 -> 재로그인 필요 |
| **재시도 불가** | `CONTEXT_OVERFLOW` | 동일 대화로는 해결 불가 -> 새 세션 필요 |
| **재시도 불가** | `VALIDATION_ERROR` | 입력 데이터 수정 필요 |
| **재시도 불가** | `PROFILE_NOT_FOUND` | 프로필 설정 필요 |
| **재시도 불가** | `MAX_RETRIES_EXCEEDED` | 이미 최대 재시도 소진 |

### 3.3 재시도 구현 의사코드

```typescript
// lib/errors/retry.ts

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 4000,
};

function calculateBackoff(attempt: number, config: RetryConfig): number {
  // 2^(attempt - 1) * baseDelay, 최대 maxDelay까지
  const delay = Math.min(
    Math.pow(2, attempt - 1) * config.baseDelayMs,
    config.maxDelayMs
  );

  // Jitter 추가 (0.5 ~ 1.5 범위 랜덤 배수)
  // -> 동시 요청이 몰릴 때 분산 효과
  const jitter = 0.5 + Math.random();
  return Math.floor(delay * jitter);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  isRetryable: (error: any) => boolean = () => true
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 재시도 불가 에러면 즉시 throw
      if (!isRetryable(error)) {
        throw error;
      }

      // 마지막 시도였으면 throw
      if (attempt > config.maxRetries) {
        throw error;
      }

      // 백오프 대기
      const delayMs = calculateBackoff(attempt, config);
      console.warn(
        `[Retry] Attempt ${attempt}/${config.maxRetries} failed. ` +
        `Retrying in ${delayMs}ms...`,
        error
      );

      await sleep(delayMs);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 3.4 스트리밍 재시도 시 부분 응답 처리

스트리밍 도중 에러가 발생하여 재시도할 때, 이미 수신한 부분 응답 처리 전략:

```
시나리오: 질문 생성 중 3번째 문장에서 스트림 끊김

수신된 부분:
"Java의 동시성 처리에 대해 이야기해보겠습니다.
첫 번째 질문입니다. synchronized 키워드와 ReentrantLock의 차이점을
설명해주"  <- 여기서 끊김

처리 전략:
1. 부분 응답을 localStorage에 임시 저장 (key: interview_draft_{sessionId})
2. 재시도 시 서버에 "이전 부분 응답 없이" 새로 요청 (완전한 새 응답 수신)
3. 새 응답이 성공적으로 완료되면:
   - 부분 응답 폐기
   - 새 응답으로 교체
4. 재시도도 실패하면:
   - 부분 응답의 마지막 완전한 문장까지만 표시
   - "[응답이 중단되었습니다. 다시 시도해주세요.]" 메시지 추가
   - DB에는 부분 응답으로 저장하지 않음 (localStorage에만 보관)
```

```typescript
// 재시도 시 부분 응답 처리 로직 (useInterviewStream 내부)

const retryWithPartialHandling = useCallback(async () => {
  if (!lastParamsRef.current) return;

  // 현재 부분 응답 백업
  const partialBackup = contentBufferRef.current;

  // 상태 초기화 후 재시도
  contentBufferRef.current = "";
  displayIndexRef.current = 0;
  setDisplayContent("");

  try {
    await startStream(lastParamsRef.current);
    // 성공 시 부분 응답 백업 폐기 (자동)
  } catch {
    // 실패 시 부분 응답 복원
    if (partialBackup.length > 0 && contentBufferRef.current.length === 0) {
      // 새 응답도 실패한 경우, 이전 부분 응답 표시
      const lastSentenceEnd = Math.max(
        partialBackup.lastIndexOf("。"),
        partialBackup.lastIndexOf("."),
        partialBackup.lastIndexOf("\n")
      );

      const safeContent =
        lastSentenceEnd > 0
          ? partialBackup.slice(0, lastSentenceEnd + 1)
          : partialBackup;

      contentBufferRef.current = safeContent;
      setContent(safeContent);
      setDisplayContent(safeContent);
    }
  }
}, [startStream]);
```

---

## 4. 부분 응답 저장 전략

### 4.1 저장 시점과 저장소

| 시점 | 저장소 | 저장 내용 | 비고 |
|------|--------|----------|------|
| 스트리밍 진행 중 (5초마다) | localStorage | 현재까지 수신된 전체 콘텐츠 | 브라우저 크래시 방어 |
| 스트리밍 정상 완료 | PostgreSQL (DB) | 전체 응답 | 기본 저장 경로 |
| 스트리밍 완료 후 localStorage 정리 | localStorage | (삭제) | 임시 데이터 정리 |
| 스트림 중단 (에러) | PostgreSQL + localStorage | 마지막 완전한 문장까지 | 부분 응답 표시 |
| DB 저장 실패 | localStorage | 전체 응답 + 메타데이터 | DB 복구 후 동기화 |

### 4.2 localStorage 임시 저장 스키마

```typescript
// localStorage에 저장되는 데이터 구조

interface DraftData {
  content: string;         // 현재까지 수신된 콘텐츠
  timestamp: number;       // 마지막 저장 시각 (unix ms)
  status: "streaming" | "failed" | "db_save_failed";
  sessionId: string;       // 세션 ID
  action: string;          // question, evaluate 등
  retryCount: number;      // 재시도 횟수
}

// localStorage 키 패턴
// interview_draft_{sessionId}

// 예시:
localStorage.setItem(
  "interview_draft_cm1abc2def",
  JSON.stringify({
    content: "Java의 동시성 처리에 대해...",
    timestamp: 1706900000000,
    status: "streaming",
    sessionId: "cm1abc2def",
    action: "question",
    retryCount: 0,
  })
);
```

### 4.3 브라우저 크래시 방어

```typescript
// 5초마다 localStorage에 임시 저장
// (useInterviewStream 내부에서 startAutoSave로 구현)

// 저장 조건:
// 1. 스트리밍 상태일 때만 (status === "streaming")
// 2. 콘텐츠가 비어있지 않을 때만
// 3. localStorage 용량 초과 시 무시 (try-catch)

// 저장 포맷:
{
  content: contentBufferRef.current,
  timestamp: Date.now(),
  status: "streaming",
  sessionId: params.sessionId,
  action: params.action,
  retryCount: retryCountRef.current,
}
```

### 4.4 세션 복원 로직

```typescript
// hooks/useSessionRecovery.ts

interface RecoveryResult {
  hasRecoverable: boolean;
  drafts: DraftData[];
}

export function useSessionRecovery() {
  // ─── 복원 가능한 임시 저장 데이터 검색 ───
  const checkRecoverable = useCallback((): RecoveryResult => {
    const drafts: DraftData[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("interview_draft_")) continue;

      try {
        const data: DraftData = JSON.parse(localStorage.getItem(key) || "");

        // 24시간 이내의 데이터만 복원 대상
        if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key); // 오래된 데이터 정리
          continue;
        }

        // 스트리밍 중이었거나 DB 저장 실패한 데이터
        if (data.status === "streaming" || data.status === "db_save_failed") {
          drafts.push(data);
        }
      } catch {
        localStorage.removeItem(key!); // 파싱 불가 데이터 정리
      }
    }

    return { hasRecoverable: drafts.length > 0, drafts };
  }, []);

  // ─── 복원 실행 ───
  const recoverDraft = useCallback(async (draft: DraftData): Promise<boolean> => {
    try {
      // DB에 부분 응답 저장 시도
      const response = await fetch("/api/interview/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: draft.sessionId,
          content: draft.content,
          action: draft.action,
        }),
      });

      if (response.ok) {
        // 성공 시 localStorage 정리
        localStorage.removeItem(`interview_draft_${draft.sessionId}`);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  // ─── 임시 저장 데이터 폐기 ───
  const discardDraft = useCallback((sessionId: string) => {
    localStorage.removeItem(`interview_draft_${sessionId}`);
  }, []);

  // ─── 오래된 임시 저장 일괄 정리 ───
  const cleanupOldDrafts = useCallback(() => {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("interview_draft_")) continue;

      try {
        const data = JSON.parse(localStorage.getItem(key) || "");
        if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }, []);

  return {
    checkRecoverable,
    recoverDraft,
    discardDraft,
    cleanupOldDrafts,
  };
}
```

### 4.5 복원 플로우

```
앱 진입 (면접 페이지 로드)
  |
  v
localStorage에서 interview_draft_* 검색
  |
  ├── 복원 가능한 데이터 없음 -> 정상 진행
  |
  └── 복원 가능한 데이터 있음
        |
        v
      Dialog 표시:
      "이전에 중단된 면접 응답이 있습니다."
      "복원하시겠습니까?"
        |
        ├── [복원] -> DB에 저장 시도 -> 성공 시 해당 세션으로 이동
        |                            -> 실패 시 Toast("복원 실패")
        |
        └── [폐기] -> localStorage에서 삭제 -> 정상 진행
```

---

## 5. 통합 에러 처리 전략

### 5.1 에러 분류 체계

```
에러
├── 클라이언트 에러 (4xx)
│   ├── 400 Bad Request
│   │   ├── VALIDATION_ERROR: 폼 유효성 검증 실패
│   │   ├── CONTEXT_OVERFLOW: 컨텍스트 윈도우 초과
│   │   └── PROFILE_NOT_FOUND: 프로필 미설정
│   ├── 401 Unauthorized
│   │   └── AUTH_FAILED: 인증 실패/만료
│   └── 429 Too Many Requests
│       └── RATE_LIMITED: API 요청 제한
│
├── 서버 에러 (5xx)
│   ├── 500 Internal Server Error
│   │   └── INTERNAL_ERROR: 예기치 않은 서버 오류
│   ├── 502 Bad Gateway
│   │   └── PROXY_AUTH_FAILED: 프록시 인증 실패
│   ├── 503 Service Unavailable
│   │   ├── PROXY_UNAVAILABLE: 프록시 서버 다운
│   │   └── DB_ERROR: DB 연결 실패
│   └── 504 Gateway Timeout
│       └── TIMEOUT: 프록시 응답 타임아웃
│
└── 네트워크 에러 (HTTP 이전)
    ├── NETWORK_ERROR: fetch 자체 실패 (DNS, 연결 등)
    └── STREAM_ERROR: 스트리밍 도중 연결 끊김
```

### 5.2 에러 표시 UI 패턴

#### 패턴 1: Toast (일시적/경미한 에러)

**사용 시나리오:**
- DB 저장 실패 (스트리밍은 성공했으나 저장만 실패)
- 통계 조회 실패
- 임시 저장 실패
- 일시적 네트워크 에러 (자동 재시도 중)

```typescript
// components/ui/toast 활용 (shadcn/ui)

// 사용 예시:
toast({
  variant: "destructive",
  title: "저장 실패",
  description: "응답 저장에 실패했습니다. 잠시 후 자동으로 재시도합니다.",
  action: <ToastAction altText="재시도">재시도</ToastAction>,
  duration: 5000, // 5초 후 자동 닫힘
});
```

**디자인 가이드:**
- 위치: 우상단
- 지속 시간: 5초 (자동 닫힘)
- 재시도 가능 시 액션 버튼 포함
- 연속 에러 시 스택 (최대 3개)

#### 패턴 2: Alert Dialog (치명적 에러)

**사용 시나리오:**
- 프록시 서버 다운 (PROXY_UNAVAILABLE)
- DB 연결 실패 (DB_ERROR, 전체 기능 영향)
- 인증 만료 (AUTH_FAILED)
- 최대 재시도 초과 (MAX_RETRIES_EXCEEDED)

```typescript
// components/ui/alert-dialog 활용 (shadcn/ui)

// 사용 예시:
<AlertDialog open={showCriticalError}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>AI 서버 연결 실패</AlertDialogTitle>
      <AlertDialogDescription>
        AI 프록시 서버(localhost:3456)에 연결할 수 없습니다.
        서버가 실행 중인지 확인해주세요.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>닫기</AlertDialogCancel>
      <AlertDialogAction onClick={checkHealth}>
        서버 상태 확인
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**디자인 가이드:**
- 모달 형태 (배경 딤 처리)
- 명확한 원인 설명 + 구체적 조치 안내
- 사용자가 명시적으로 닫아야 함
- 복구 액션 버튼 제공

#### 패턴 3: Inline Error (폼 검증)

**사용 시나리오:**
- 프로필 폼 유효성 검증 실패
- 세션 설정 폼 검증 실패
- 답변 입력 검증 (빈 답변 제출 시도 등)

```typescript
// Zod + React Hook Form 연동

// 사용 예시:
<FormField
  control={form.control}
  name="name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>이름</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />  {/* 자동으로 에러 메시지 표시 */}
    </FormItem>
  )}
/>
```

**디자인 가이드:**
- 해당 필드 바로 아래에 빨간색 텍스트
- 필드 테두리 빨간색 하이라이트
- 에러 메시지와 함께 수정 가이드 제공
- 에러 필드로 자동 포커스 이동

### 5.3 에러 처리 유틸리티

```typescript
// lib/errors/handler.ts

import { toast } from "@/components/ui/use-toast";

type ErrorSeverity = "toast" | "dialog" | "inline" | "silent";

interface ErrorDisplayConfig {
  severity: ErrorSeverity;
  title: string;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  redirect?: string;
}

// 에러 코드 -> 표시 설정 매핑
const ERROR_DISPLAY_MAP: Record<string, ErrorDisplayConfig> = {
  AUTH_FAILED: {
    severity: "dialog",
    title: "인증 만료",
    message: "인증이 만료되었습니다. 다시 로그인해주세요.",
    redirect: "/login",
  },
  PROXY_UNAVAILABLE: {
    severity: "dialog",
    title: "AI 서버 연결 실패",
    message:
      "AI 프록시 서버(localhost:3456)에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.",
    action: {
      label: "서버 상태 확인",
      handler: () => fetch("/api/health"),
    },
  },
  TIMEOUT: {
    severity: "toast",
    title: "응답 시간 초과",
    message: "AI 응답 시간이 초과되었습니다. 자동으로 재시도합니다.",
  },
  CONTEXT_OVERFLOW: {
    severity: "dialog",
    title: "대화 길이 초과",
    message:
      "대화가 너무 길어 AI가 처리할 수 없습니다. 면접을 종료하고 새 세션을 시작해주세요.",
    action: {
      label: "새 세션 시작",
      handler: () => (window.location.href = "/interview"),
    },
  },
  RATE_LIMITED: {
    severity: "toast",
    title: "요청 제한",
    message: "요청이 너무 많습니다. 잠시 후 자동으로 재시도합니다.",
  },
  DB_ERROR: {
    severity: "dialog",
    title: "데이터베이스 연결 실패",
    message: "데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
    action: {
      label: "재시도",
      handler: () => window.location.reload(),
    },
  },
  PROFILE_NOT_FOUND: {
    severity: "dialog",
    title: "프로필 미설정",
    message: "면접을 시작하려면 먼저 프로필을 설정해주세요.",
    redirect: "/profile/onboarding",
  },
  STREAM_ERROR: {
    severity: "toast",
    title: "스트리밍 중단",
    message: "응답 수신 중 연결이 끊어졌습니다. 수신된 내용까지 저장되었습니다.",
  },
  NETWORK_ERROR: {
    severity: "toast",
    title: "네트워크 오류",
    message: "인터넷 연결을 확인해주세요.",
  },
  VALIDATION_ERROR: {
    severity: "inline",
    title: "입력 오류",
    message: "입력 내용을 확인해주세요.",
  },
};

// 통합 에러 핸들러
export function handleAppError(
  code: string,
  options?: {
    customMessage?: string;
    onDialogAction?: () => void;
  }
): ErrorDisplayConfig {
  const config = ERROR_DISPLAY_MAP[code] || {
    severity: "toast" as ErrorSeverity,
    title: "오류 발생",
    message: options?.customMessage || "예상치 못한 오류가 발생했습니다.",
  };

  switch (config.severity) {
    case "toast":
      toast({
        variant: "destructive",
        title: config.title,
        description: options?.customMessage || config.message,
        duration: 5000,
      });
      break;

    case "dialog":
      // Dialog 상태는 React 상태로 관리 (전역 에러 스토어)
      useErrorStore.getState().showError({
        ...config,
        action: options?.onDialogAction
          ? { ...config.action!, handler: options.onDialogAction }
          : config.action,
      });
      break;

    case "silent":
      // 콘솔에만 기록
      console.error(`[${code}]`, config.message);
      break;
  }

  return config;
}
```

### 5.4 전역 에러 상태 관리

```typescript
// lib/stores/error-store.ts

import { create } from "zustand";

interface ErrorState {
  // Dialog 에러
  dialogError: ErrorDisplayConfig | null;
  showError: (config: ErrorDisplayConfig) => void;
  clearError: () => void;

  // 온라인 상태
  isOnline: boolean;
  setOnline: (online: boolean) => void;

  // 프록시 상태
  proxyStatus: "unknown" | "healthy" | "unhealthy";
  setProxyStatus: (status: "unknown" | "healthy" | "unhealthy") => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  dialogError: null,
  showError: (config) => set({ dialogError: config }),
  clearError: () => set({ dialogError: null }),

  isOnline: true,
  setOnline: (online) => set({ isOnline: online }),

  proxyStatus: "unknown",
  setProxyStatus: (status) => set({ proxyStatus: status }),
}));
```

### 5.5 Next.js error.tsx 활용 패턴

```typescript
// app/error.tsx -- 전역 에러 바운더리

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러 로깅
    console.error("[GlobalError]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4 p-8">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">
          예상치 못한 오류가 발생했습니다
        </h2>
        <p className="text-muted-foreground max-w-md">
          {error.message || "페이지를 표시하는 중 문제가 발생했습니다."}
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            홈으로
          </Button>
          <Button onClick={reset}>다시 시도</Button>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// app/interview/[sessionId]/error.tsx -- 면접 페이지 전용 에러 바운더리

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSessionRecovery } from "@/hooks/useSessionRecovery";

export default function InterviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { checkRecoverable } = useSessionRecovery();

  useEffect(() => {
    console.error("[InterviewError]", error);
  }, [error]);

  const handleRecover = async () => {
    const { hasRecoverable } = checkRecoverable();
    if (hasRecoverable) {
      // 복원 로직 실행
    }
    reset();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <h2 className="text-xl font-semibold">면접 진행 중 오류가 발생했습니다</h2>
      <p className="text-muted-foreground">
        이전 응답이 저장되어 있다면 복원을 시도할 수 있습니다.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.href = "/interview"}>
          새 면접 시작
        </Button>
        <Button onClick={handleRecover}>복원 시도</Button>
      </div>
    </div>
  );
}
```

---

## 6. 헬스체크 시스템

### 6.1 /api/health 엔드포인트 상세 설계

```typescript
// app/api/health/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// ─── 응답 타입 ───
interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number; // 초
  checks: {
    database: ComponentHealth;
    aiProxy: ComponentHealth;
  };
}

interface ComponentHealth {
  status: "healthy" | "unhealthy";
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
}

const startTime = Date.now();

export async function GET(req: NextRequest) {
  const results: HealthCheckResponse = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: { status: "unhealthy", latencyMs: 0 },
      aiProxy: { status: "unhealthy", latencyMs: 0 },
    },
  };

  // ─── DB 연결 체크 ───
  const dbStart = Date.now();
  try {
    // 간단한 쿼리로 연결 확인
    await prisma.$queryRaw`SELECT 1`;
    results.checks.database = {
      status: "healthy",
      latencyMs: Date.now() - dbStart,
      details: {
        provider: "postgresql",
      },
    };
  } catch (dbError: any) {
    results.checks.database = {
      status: "unhealthy",
      latencyMs: Date.now() - dbStart,
      message: dbError.message || "Database connection failed",
      details: {
        code: dbError.code,
      },
    };
  }

  // ─── AI 프록시 연결 체크 ───
  const proxyStart = Date.now();
  const proxyUrl = process.env.AI_PROXY_URL || "http://localhost:3456";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

    const proxyResponse = await fetch(`${proxyUrl}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (proxyResponse.ok) {
      const proxyData = await proxyResponse.json().catch(() => null);
      results.checks.aiProxy = {
        status: "healthy",
        latencyMs: Date.now() - proxyStart,
        details: {
          url: proxyUrl,
          proxyVersion: proxyData?.version,
          models: proxyData?.models,
        },
      };
    } else {
      results.checks.aiProxy = {
        status: "unhealthy",
        latencyMs: Date.now() - proxyStart,
        message: `Proxy returned ${proxyResponse.status}`,
        details: {
          url: proxyUrl,
          httpStatus: proxyResponse.status,
        },
      };
    }
  } catch (proxyError: any) {
    results.checks.aiProxy = {
      status: "unhealthy",
      latencyMs: Date.now() - proxyStart,
      message:
        proxyError.name === "AbortError"
          ? "Health check timed out (5s)"
          : proxyError.cause?.code === "ECONNREFUSED"
            ? "Proxy server is not running"
            : proxyError.message,
      details: {
        url: proxyUrl,
        errorCode: proxyError.cause?.code,
      },
    };
  }

  // ─── 전체 상태 결정 ───
  const allHealthy = Object.values(results.checks).every(
    (c) => c.status === "healthy"
  );
  const allUnhealthy = Object.values(results.checks).every(
    (c) => c.status === "unhealthy"
  );

  results.status = allHealthy
    ? "healthy"
    : allUnhealthy
      ? "unhealthy"
      : "degraded";

  // HTTP 상태 코드: 정상=200, 부분장애=200, 전체장애=503
  const httpStatus = results.status === "unhealthy" ? 503 : 200;

  return NextResponse.json(results, { status: httpStatus });
}
```

### 6.2 응답 포맷 예시

#### 정상 상태
```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T09:30:00.000Z",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "healthy",
      "latencyMs": 3,
      "details": {
        "provider": "postgresql"
      }
    },
    "aiProxy": {
      "status": "healthy",
      "latencyMs": 15,
      "details": {
        "url": "http://localhost:3456",
        "proxyVersion": "1.2.0",
        "models": ["claude-sonnet-4"]
      }
    }
  }
}
```

#### 부분 장애 (프록시 다운)
```json
{
  "status": "degraded",
  "timestamp": "2026-02-03T09:30:00.000Z",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "healthy",
      "latencyMs": 2,
      "details": {
        "provider": "postgresql"
      }
    },
    "aiProxy": {
      "status": "unhealthy",
      "latencyMs": 5001,
      "message": "Proxy server is not running",
      "details": {
        "url": "http://localhost:3456",
        "errorCode": "ECONNREFUSED"
      }
    }
  }
}
```

### 6.3 클라이언트 측 헬스체크 활용

```typescript
// hooks/useHealthCheck.ts

import { useState, useEffect, useCallback } from "react";
import { useErrorStore } from "@/lib/stores/error-store";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy" | "checking";
  database: boolean;
  aiProxy: boolean;
  lastChecked: Date | null;
}

export function useHealthCheck(intervalMs: number = 60000) {
  const [health, setHealth] = useState<HealthStatus>({
    status: "checking",
    database: false,
    aiProxy: false,
    lastChecked: null,
  });

  const { setProxyStatus } = useErrorStore();

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/health");
      const data = await response.json();

      setHealth({
        status: data.status,
        database: data.checks.database.status === "healthy",
        aiProxy: data.checks.aiProxy.status === "healthy",
        lastChecked: new Date(),
      });

      // 전역 프록시 상태 업데이트
      setProxyStatus(
        data.checks.aiProxy.status === "healthy" ? "healthy" : "unhealthy"
      );
    } catch {
      setHealth({
        status: "unhealthy",
        database: false,
        aiProxy: false,
        lastChecked: new Date(),
      });
      setProxyStatus("unhealthy");
    }
  }, [setProxyStatus]);

  // 초기 체크 + 주기적 체크
  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, intervalMs);
    return () => clearInterval(timer);
  }, [checkHealth, intervalMs]);

  return { health, checkHealth };
}
```

### 6.4 헬스체크 활용 시나리오

| 시나리오 | 체크 주기 | 동작 |
|----------|----------|------|
| 앱 초기 로드 | 즉시 1회 | 프록시/DB 상태 확인. 비정상 시 배너 표시 |
| 백그라운드 폴링 | 60초마다 | 상태 변경 감지. unhealthy -> healthy 전환 시 Toast("서비스가 복구되었습니다") |
| 면접 시작 전 | 즉시 1회 | 프록시 비정상이면 면접 시작 버튼 비활성화 + 안내 메시지 |
| 에러 발생 후 | 즉시 1회 | 에러 원인 파악용. Dialog에 상세 상태 표시 |

---

## 7. 에러 로깅

### 7.1 서버 측 로깅

#### 구조화된 로그 포맷

모든 서버 로그는 Docker logs에서 쉽게 필터링/분석할 수 있도록 구조화된 포맷을 사용한다.

```typescript
// lib/logger.ts

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;      // 발생 위치 (예: "STREAM", "AUTH", "DB")
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  requestId?: string;
}

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, extra?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(extra && { data: extra }),
    };

    const logStr = JSON.stringify(entry);

    switch (level) {
      case "debug":
        if (process.env.NODE_ENV !== "production") console.debug(logStr);
        break;
      case "info":
        console.info(logStr);
        break;
      case "warn":
        console.warn(logStr);
        break;
      case "error":
        console.error(logStr);
        break;
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log("warn", message, data);
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>) {
    const errorInfo =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          }
        : error
          ? { message: String(error) }
          : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "error",
      context: this.context,
      message,
      ...(errorInfo && { error: errorInfo }),
      ...(data && { data }),
    };

    console.error(JSON.stringify(entry));
  }
}

// 팩토리 함수
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// 사전 정의된 로거
export const streamLogger = createLogger("STREAM");
export const authLogger = createLogger("AUTH");
export const dbLogger = createLogger("DB");
export const healthLogger = createLogger("HEALTH");
```

#### 서버 로그 출력 예시

```json
{"timestamp":"2026-02-03T09:30:00.123Z","level":"info","context":"STREAM","message":"Streaming started","data":{"sessionId":"cm1abc2def","action":"question","model":"claude-sonnet-4"}}

{"timestamp":"2026-02-03T09:30:15.456Z","level":"info","context":"STREAM","message":"Streaming completed","data":{"sessionId":"cm1abc2def","contentLength":1234,"durationMs":15333}}

{"timestamp":"2026-02-03T09:30:00.789Z","level":"error","context":"STREAM","message":"Proxy connection failed","error":{"name":"TypeError","message":"fetch failed","code":"ECONNREFUSED"},"data":{"proxyUrl":"http://localhost:3456/v1/chat/completions"}}

{"timestamp":"2026-02-03T09:30:30.012Z","level":"warn","context":"STREAM","message":"Stream timeout after 30s","data":{"sessionId":"cm1abc2def","elapsedMs":30001}}

{"timestamp":"2026-02-03T09:30:00.345Z","level":"error","context":"DB","message":"Database query failed","error":{"name":"PrismaClientKnownRequestError","message":"Can't reach database server at `db:5432`","code":"P1001"}}
```

#### API Route 내 사용 예시

```typescript
// app/api/interview/stream/route.ts 내부

import { streamLogger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  streamLogger.info("Stream request received", {
    requestId,
    sessionId: body.sessionId,
    action: body.action,
  });

  try {
    // ... 스트리밍 로직
    streamLogger.info("Streaming completed", {
      requestId,
      sessionId: body.sessionId,
      contentLength: fullContent.length,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    streamLogger.error("Streaming failed", error, {
      requestId,
      sessionId: body.sessionId,
      partialContentLength: fullContent.length,
    });
  }
}
```

### 7.2 클라이언트 측 로깅

#### 에러 바운더리 통합

```typescript
// components/ErrorBoundary.tsx

"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 구조화된 클라이언트 에러 로그
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        context: "CLIENT_ERROR_BOUNDARY",
        message: error.message,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        componentStack: errorInfo.componentStack,
      })
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback />;
    }
    return this.props.children;
  }
}
```

#### 클라이언트 콘솔 레벨 구분

```typescript
// lib/client-logger.ts

const CLIENT_LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

// 프로덕션에서는 warn 이상만 출력
const MIN_LEVEL =
  process.env.NODE_ENV === "production"
    ? CLIENT_LOG_LEVELS.warn
    : CLIENT_LOG_LEVELS.debug;

export const clientLogger = {
  debug(context: string, message: string, data?: unknown) {
    if (CLIENT_LOG_LEVELS.debug >= MIN_LEVEL) {
      console.debug(`[${context}]`, message, data || "");
    }
  },

  info(context: string, message: string, data?: unknown) {
    if (CLIENT_LOG_LEVELS.info >= MIN_LEVEL) {
      console.info(`[${context}]`, message, data || "");
    }
  },

  warn(context: string, message: string, data?: unknown) {
    if (CLIENT_LOG_LEVELS.warn >= MIN_LEVEL) {
      console.warn(`[${context}]`, message, data || "");
    }
  },

  error(context: string, message: string, error?: Error | unknown, data?: unknown) {
    console.error(`[${context}]`, message, error, data || "");
  },
};

// 사용 예시:
// clientLogger.info("STREAM", "Streaming started", { sessionId });
// clientLogger.error("STREAM", "Stream failed", error, { sessionId });
// clientLogger.warn("STREAM", "JSON parse error in SSE chunk", { chunk: jsonStr });
```

### 7.3 Docker Logs 확인

서버 로그는 JSON 형식으로 출력되므로 `docker logs`와 `jq`를 조합하여 필터링할 수 있다.

```bash
# 전체 로그 확인
docker logs interview-bot-app

# 에러 로그만 필터링
docker logs interview-bot-app 2>&1 | grep '"level":"error"'

# 특정 컨텍스트(STREAM) 로그만 확인
docker logs interview-bot-app 2>&1 | grep '"context":"STREAM"'

# jq로 포맷팅 (jq 설치 필요)
docker logs interview-bot-app 2>&1 | \
  grep -o '{.*}' | \
  jq 'select(.level == "error")'

# 실시간 로그 모니터링 (에러만)
docker logs -f interview-bot-app 2>&1 | grep '"level":"error"'

# 최근 100줄만
docker logs --tail 100 interview-bot-app

# 특정 시간 이후 로그
docker logs --since "2026-02-03T09:00:00" interview-bot-app
```

### 7.4 로깅 요약

| 계층 | 로그 방식 | 포맷 | 확인 방법 |
|------|----------|------|----------|
| 서버 (API Route) | `console.error/warn/info` + JSON | `{"timestamp", "level", "context", "message", ...}` | `docker logs` + grep/jq |
| 서버 (Prisma) | Prisma 내장 로깅 | SQL 쿼리 로그 (개발 모드) | `docker logs` |
| 클라이언트 (에러 바운더리) | `console.error` + JSON | componentStack 포함 | 브라우저 DevTools |
| 클라이언트 (일반) | `clientLogger` 레벨별 | `[CONTEXT] message` | 브라우저 DevTools |
| 클라이언트 (스트리밍) | `clientLogger.warn/error` | SSE 파싱 에러, 연결 에러 | 브라우저 DevTools |

---

## 부록: 전체 흐름 시퀀스

```
사용자가 답변 제출
        │
        v
[클라이언트] useInterviewStream.startStream()
        │
        ├── 상태: idle -> streaming
        ├── localStorage 임시 저장 시작 (5초 간격)
        ├── 타이핑 효과 rAF 루프 시작
        │
        v
[클라이언트] fetch POST /api/interview/stream
        │
        v
[서버] API Route
        ├── 인증 검증 (JWT)
        ├── DB에서 세션 로드 (Prisma)
        ├── 시스템 프롬프트 구성 (프로필 + 포지션 컨텍스트)
        ├── 메시지 히스토리 구성
        │
        v
[서버] fetch POST http://localhost:3456/v1/chat/completions (stream: true)
        │
        v
[프록시] claude-max-api-proxy
        ├── Claude API 호출
        └── SSE 스트리밍 응답 반환
        │
        v
[서버] SSE 파싱 루프
        ├── 각 "data: {...}" 라인 파싱
        ├── delta.content 추출 및 누적 (fullContent)
        ├── 원본 SSE 포맷으로 클라이언트에 전달 (ReadableStream)
        └── "data: [DONE]" 수신 시 -> DB에 전체 응답 저장
        │
        v
[클라이언트] ReadableStream reader 루프
        ├── TextDecoder로 바이트 -> 문자열
        ├── SSE 라인 파싱
        ├── delta.content -> contentBuffer에 누적
        ├── onChunk 콜백 호출
        └── 타이핑 효과로 displayContent 점진적 갱신
        │
        v
[클라이언트] "data: [DONE]" 수신
        ├── 타이핑 효과 완료 대기
        ├── 상태: streaming -> complete
        ├── onComplete 콜백 호출
        └── localStorage 임시 저장 제거
```
