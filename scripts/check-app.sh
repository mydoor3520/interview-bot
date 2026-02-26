#!/bin/bash
HEALTH=$(curl -sf --max-time 10 http://localhost:3000/api/health 2>/dev/null)
STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)

if [ "$STATUS" != "ok" ] && [ "$STATUS" != "degraded" ]; then
  curl -s -X POST 'https://api.resend.com/emails' \
    -H "Authorization: Bearer ${RESEND_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "{
      \"from\": \"monitor@${MONITOR_DOMAIN:-interviewbot.kr}\",
      \"to\": \"${MONITOR_EMAIL:-admin@interviewbot.kr}\",
      \"subject\": \"[CRITICAL] Interview Bot service down\",
      \"text\": \"Health status: ${STATUS}\nResponse: ${HEALTH}\"
    }"
  echo "[$(date)] CRITICAL: App health check failed: $STATUS"
fi
