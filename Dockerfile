# Базовый образ зафиксирован по digest (этап 3, открытый пункт «фиксация digests»): с плавающим
# `node:22-alpine` пересборка того же коммита в другой день даёт другой образ, и откат по тегу
# (3.3, `scripts/release.sh`) перестаёт воспроизводить то, что реально работало.
# Обновление — отдельной правкой, где рядом стоит записать, что проверяли (`docker manifest
# inspect node:22-alpine@<digest>` подтверждает, что digest живёт в registry).
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --ignore-scripts
RUN npx prisma generate

FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json tsconfig.json vite.config.ts ./
COPY server.ts ./
COPY src/ ./src/
COPY index.html ./
COPY public/ ./public/
COPY prisma ./prisma/

# Клиент импортирует два файла вне src/: src/utils/bookRecipeNutrients.ts:5 ->
# ../../book-ingredient-decisions.json и src/utils/bookRegistryShadow.ts ->
# ../../output/book-registry.json. Без них `vite build` внутри образа падает
# («Could not resolve»), хотя локально в репозитории эти файлы на месте.
COPY book-ingredient-decisions.json ./
COPY output/book-registry.json ./output/

RUN npx vite build

# Без --sourcemap (этап 3): карта `server.mjs.map` несёт в себе полные исходники сервера
# (`sourcesContent`: в замере 138after — 2 154 648 Б против 1 525 966 Б самого бандла),
# а наружу она уезжает, потому что `COPY --from=builder /app/build ./build` забирает каталог
# целиком. Рантайму карта не нужна: `--enable-source-maps`/`source-map-support` не заданы ни в
# Dockerfile, ни в entrypoint, ни в `k8s-deployment.yaml` (замер: 0 вхождений), то есть стектрейс
# и без неё указывает на `build/server.mjs:<строка>`. Нужна расшифровка конкретного падения —
# та же команда с `--sourcemap` на том же коммите, но вне образа.
RUN npx esbuild server.ts --bundle --platform=node --format=esm \
    --packages=external --outfile=build/server.mjs

FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Рантайм пода (этап 3.10): серверный бандл собирается с --packages=external, поэтому наружу
# должны ехать только те пакеты, которые он реально импортирует, — плюс пара prisma+tsx,
# которую зовёт docker-entrypoint.sh (migrate deploy / generate / db seed = «tsx prisma/seed.ts»).
# v6-сборщик (vite, @tailwindcss/vite, @vitejs/plugin-react) и клиентские библиотеки
# (react, recharts, lucide-react, zustand, motion, html5-qrcode) нужны только стадии builder:
# сервер обращается к vite лишь в ветке `if (!IS_PRODUCTION)` (server.ts:3233), в проде она недостижима.
RUN npm ci --omit=dev --ignore-scripts
RUN npx prisma generate

FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS runner
WORKDIR /app

RUN apk add --no-cache curl tini

COPY --from=prod-deps /app/node_modules ./node_modules
# package.json обязателен в рантайме: docker-entrypoint.sh при пустой BookRecipe зовёт
# `npx prisma db seed`, а Prisma берёт команду сида из поля "prisma"."seed" этого файла.
# Без него замер m-124: seed завершается с кодом 0 и одним байтом вывода, таблица остаётся
# пустой, а `|| echo "Seed skipped or failed"` глотает даже это.
COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=prod-deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/anna_wiki ./src/anna_wiki
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/src/assets/images ./src/assets/images
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

# tini = PID 1: он пропускает SIGTERM дальше по процессу и подбирает детей.
# Без него node как PID 1 сигнал не получает: замер `docker stop -t 15` — все 15 с
# и код 137 (SIGKILL), с tini — 0 с и код 143.
ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]
CMD ["node", "--max-old-space-size=400", "build/server.mjs"]
