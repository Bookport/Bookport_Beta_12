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
COPY prisma ./prisma/

RUN npx vite build
RUN npx esbuild server.ts --bundle --platform=node --format=cjs \
    --packages=external --sourcemap --outfile=dist/server.cjs
RUN mkdir -p dist/src/assets/images/anna && \
    cp -r src/assets/images/anna/* dist/src/assets/images/anna/ 2>/dev/null || true

FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/anna_wiki ./src/anna_wiki
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/src/assets/images ./src/assets/images

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.cjs"]
