#!/bin/bash
USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
THRESHOLD=80

if [ "$USAGE" -gt "$THRESHOLD" ]; then
  curl -s -X POST 'https://api.resend.com/emails' \
    -H "Authorization: Bearer ${RESEND_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "{
      \"from\": \"monitor@${MONITOR_DOMAIN:-interviewbot.kr}\",
      \"to\": \"${MONITOR_EMAIL:-admin@interviewbot.kr}\",
      \"subject\": \"[Alert] Interview Bot disk usage ${USAGE}%\",
      \"text\": \"Mac Mini disk usage is at ${USAGE}%. Cleanup needed.\"
    }"
  echo "[$(date)] ALERT: Disk usage ${USAGE}%"
fi
