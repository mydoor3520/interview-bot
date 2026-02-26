#!/bin/bash
UNHEALTHY=$(docker ps --filter "name=interview-bot" --filter "health=unhealthy" --format "{{.Names}}" 2>/dev/null)
EXITED=$(docker ps -a --filter "name=interview-bot" --filter "status=exited" --format "{{.Names}}" 2>/dev/null)

ISSUES="${UNHEALTHY}${EXITED}"

if [ -n "$ISSUES" ]; then
  cd "${PROJECT_DIR:-$HOME/project/interview-bot}"
  docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d

  curl -s -X POST 'https://api.resend.com/emails' \
    -H "Authorization: Bearer ${RESEND_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "{
      \"from\": \"monitor@${MONITOR_DOMAIN:-interviewbot.kr}\",
      \"to\": \"${MONITOR_EMAIL:-admin@interviewbot.kr}\",
      \"subject\": \"[Alert] Interview Bot container issue\",
      \"text\": \"Problem containers: ${ISSUES}\nAuto-restart attempted.\"
    }"
  echo "[$(date)] ALERT: Container issues: $ISSUES — auto-restarted"
fi
