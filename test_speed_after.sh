#!/bin/bash
npm run build >/dev/null 2>&1
NODE_ENV=test node dist/server.cjs &
SERVER_PID=$!
sleep 5

echo "Делаем запрос к /api/analyze-dish (AFTER)..."
time curl -s -X POST http://localhost:3001/api/analyze-dish \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Init-Data: test-auth" \
  -d '{"ingredients": [{"fullName": "Киноа", "weight": 100}, {"fullName": "Куриная грудка", "weight": 150}]}' > /dev/null

echo ""
kill $SERVER_PID
