# Claude Max API Proxy 설치 및 실행 가이드

## 개요

`claude-max-api-proxy`는 Claude Max 구독을 OpenAI 호환 API로 노출하는 커뮤니티 프록시입니다. 이를 통해 Claude의 웹 인터페이스 대신 API를 통해 프로그래밍 방식으로 접근할 수 있습니다.

- **GitHub**: https://github.com/nicekid1/claude-max-api-proxy
- **라이선스**: 커뮤니티 프로젝트 (공식 Anthropic 제품 아님)

## 사전 요구사항

- **Node.js 18 이상**: [nodejs.org](https://nodejs.org)에서 설치
- **Claude Max 구독**: 활성화된 Claude Max 계정 필요
- **Chrome 브라우저**: 인증 시 Chrome이 사용됩니다

## 설치 방법

### 방법 1: npx로 바로 실행 (권장)

설치 없이 바로 실행할 수 있습니다:

```bash
npx claude-max-api-proxy
```

### 방법 2: 글로벌 설치

자주 사용하는 경우 글로벌로 설치할 수 있습니다:

```bash
npm install -g claude-max-api-proxy
```

설치 후 실행:

```bash
claude-max-api-proxy
```

## 실행 방법

### 기본 실행

터미널에서 다음 명령을 실행합니다:

```bash
npx claude-max-api-proxy
```

프록시는 기본적으로 **포트 3456**에서 실행됩니다.

### 초기 실행 시 인증

처음 실행하면 Chrome 브라우저가 자동으로 열리며 Claude 로그인 페이지가 나타날 수 있습니다:

1. Claude 계정으로 로그인
2. 로그인이 완료되면 브라우저 창을 닫아도 됩니다
3. 프록시가 인증 정보를 저장하여 다음부터는 자동 로그인됩니다

### 실행 확인

프록시가 정상적으로 실행되면 다음과 같은 메시지를 볼 수 있습니다:

```
Server running on http://localhost:3456
```

## 동작 확인

### 헬스체크

프록시가 정상 동작하는지 확인:

```bash
curl http://localhost:3456/v1/models
```

정상 응답 예시:

```json
{
  "object": "list",
  "data": [
    {
      "id": "claude-opus-4",
      "object": "model",
      "created": 1234567890,
      "owned_by": "anthropic"
    }
  ]
}
```

### 테스트 요청 예제

Chat Completions API 호출:

```bash
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4",
    "messages": [
      {
        "role": "user",
        "content": "안녕하세요!"
      }
    ]
  }'
```

### 스트리밍 테스트

실시간 스트리밍 응답 테스트:

```bash
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4",
    "messages": [
      {
        "role": "user",
        "content": "1부터 10까지 세어주세요"
      }
    ],
    "stream": true
  }'
```

## 트러블슈팅

### ECONNREFUSED 에러

**증상**: `connect ECONNREFUSED 127.0.0.1:3456`

**원인**: 프록시가 실행되지 않음

**해결**:
```bash
# 프록시 실행 확인
lsof -i :3456

# 실행되지 않았다면 프록시 시작
npx claude-max-api-proxy
```

### 인증 실패

**증상**: `401 Unauthorized` 또는 인증 관련 에러

**해결**:
1. 프록시를 중지 (Ctrl+C)
2. 저장된 인증 정보 삭제 (프록시가 안내하는 경로의 파일 삭제)
3. 프록시 재시작하여 재로그인

### 포트 충돌

**증상**: `Error: listen EADDRINUSE: address already in use :::3456`

**원인**: 다른 프로세스가 포트 3456을 사용 중

**해결**:
```bash
# 포트 사용 프로세스 확인
lsof -i :3456

# 프로세스 종료 (PID 확인 후)
kill -9 <PID>
```

또는 다른 포트 사용 (프록시가 포트 설정을 지원하는 경우 문서 참조)

### Chrome 브라우저 자동 실행 실패

**증상**: 브라우저가 열리지 않음

**해결**:
- Chrome이 설치되어 있는지 확인
- 수동으로 `http://claude.ai`에서 로그인 후 재시도

## Docker 환경에서의 접근

### 호스트의 프록시에 접근

Docker 컨테이너 내부에서 호스트 OS에서 실행 중인 프록시에 접근하려면:

```bash
# Docker 컨테이너에서
curl http://host.docker.internal:3456/v1/models
```

### AI_PROXY_URL 환경변수 설정

이 프로젝트에서는 `.env` 파일에 다음과 같이 설정:

```env
AI_PROXY_URL=http://host.docker.internal:3456
```

- `host.docker.internal`은 Docker Desktop에서 호스트 OS를 가리키는 특수 DNS 이름입니다
- Linux에서는 `--add-host=host.docker.internal:host-gateway` 옵션이 필요할 수 있습니다

### docker-compose.yml 예시

```yaml
services:
  app:
    build: .
    environment:
      - AI_PROXY_URL=http://host.docker.internal:3456
    # Linux의 경우:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

## 주의사항

### 중요: 프록시 실행 위치

- **프록시는 항상 Docker 외부(호스트 OS)에서 실행해야 합니다**
- Docker 컨테이너 내부에서 프록시를 실행하면 Chrome 인증 문제가 발생할 수 있습니다

### 개발 워크플로우

1. **터미널 1**: 호스트 OS에서 프록시 실행
   ```bash
   npx claude-max-api-proxy
   ```

2. **터미널 2**: Docker 컨테이너 실행
   ```bash
   docker compose up
   ```

3. 개발 중에는 프록시가 계속 실행 상태를 유지해야 합니다

### 보안 고려사항

- 프록시는 로컬 개발 환경에서만 사용하세요
- 프로덕션 환경에서는 공식 Anthropic API 사용을 권장합니다
- API 키나 인증 정보를 Git에 커밋하지 마세요

## 참고 자료

- [claude-max-api-proxy GitHub](https://github.com/nicekid1/claude-max-api-proxy)
- [OpenAI API 호환성 문서](https://platform.openai.com/docs/api-reference)
- [Docker host.docker.internal 문서](https://docs.docker.com/desktop/networking/#i-want-to-connect-from-a-container-to-a-service-on-the-host)

## 문제 발생 시

1. 프록시 로그 확인 (터미널 출력)
2. Docker 컨테이너 로그 확인: `docker compose logs`
3. 네트워크 연결 확인: `curl http://localhost:3456/v1/models`
4. GitHub Issues에서 유사한 문제 검색

---

**작성일**: 2026-02-04
**버전**: 1.0
