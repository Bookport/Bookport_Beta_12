/**
 * Браузерная заглушка `@prisma/client` — подставляется только в сборку для браузера
 * (через resolve.alias в vite.config.ts). Сервер к базе ходит по-прежнему:
 * `server.ts` собирается отдельным шагом esbuild и этот конфиг не читает.
 *
 * Конструктор намеренно бросает: src/prisma.ts оборачивает создание клиента
 * в try/catch и оставляет `prisma === null` — ровно то же самое происходит
 * и сейчас в dev-режиме, где браузерный стенд Prisma тоже нерабочий.
 */
export class PrismaClient {
  constructor() {
    throw new Error("@prisma/client недоступен в браузере");
  }
}

export default { PrismaClient };
