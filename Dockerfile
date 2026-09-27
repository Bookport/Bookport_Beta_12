FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --ignore-scripts
RUN npx prisma generate

FROM node:22-alpine AS builder
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
RUN npx esbuild server.ts --bundle --platform=node --format=esm \
    --packages=external --sourcemap --outfile=build/server.mjs

FROM node:22-alpine AS prod-deps
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

FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl tini

COPY --from=prod-deps /app/node_modules ./node_modules
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
