#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Configuration
PROXY_HOST="localhost"
PROXY_PORT="3456"
PROXY_URL="http://${PROXY_HOST}:${PROXY_PORT}"
TIMEOUT=5

# Check if claude-max-api-proxy is running - health check
check_health() {
    if curl -s --max-time $TIMEOUT "${PROXY_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}[✓]${NC} claude-max-api-proxy 실행 중 (${PROXY_URL})"
        return 0
    else
        echo -e "${RED}[✗]${NC} claude-max-api-proxy에 연결할 수 없습니다"
        echo "프록시가 실행 중인지 확인하세요: npx claude-max-api-proxy"
        return 1
    fi
}

# Check /v1/models endpoint
check_models() {
    response=$(curl -s --max-time $TIMEOUT "${PROXY_URL}/v1/models" 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[✓]${NC} 모델 목록 응답 확인"
        return 0
    else
        echo -e "${RED}[✗]${NC} 모델 목록을 가져올 수 없습니다"
        return 1
    fi
}

# Test chat completion endpoint
test_chat_completion() {
    response=$(curl -s --max-time $TIMEOUT \
        -X POST "${PROXY_URL}/v1/chat/completions" \
        -H "Content-Type: application/json" \
        -d '{
            "model": "claude-3-5-sonnet-20241022",
            "messages": [
                {
                    "role": "user",
                    "content": "Hello"
                }
            ],
            "max_tokens": 10
        }' 2>&1)

    if [ $? -eq 0 ] && echo "$response" | grep -q "content"; then
        echo -e "${GREEN}[✓]${NC} 채팅 완성 테스트 성공"
        return 0
    else
        echo -e "${RED}[✗]${NC} 채팅 완성 테스트 실패"
        return 1
    fi
}

# Main execution
main() {
    check_health
    health_result=$?

    if [ $health_result -ne 0 ]; then
        exit 1
    fi

    check_models
    models_result=$?

    if [ $models_result -ne 0 ]; then
        exit 1
    fi

    test_chat_completion
    chat_result=$?

    if [ $chat_result -eq 0 ]; then
        echo -e "${GREEN}프록시가 정상적으로 동작합니다.${NC}"
        exit 0
    else
        exit 1
    fi
}

main
