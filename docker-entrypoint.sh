#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Generating Prisma Client..."
npx prisma generate

# Справочник Книги читается сервером (src/services/annaRecipeLookup.ts:103,
# src/services/annaTools.ts:187,353,386), поэтому при пустой таблице его надо заполнить.
# Дёргать seed на каждом старте контейнера незачем: он upsert-ом перезаписывает 151 строку
# и теряет правки, сделанные не через prisma/seed.ts.
BOOK_ROWS=$(node -e 'const {PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.bookRecipe.count().then(n=>{console.log(n);return p.$disconnect()}).catch(()=>{console.log("unknown")})' 2>/dev/null || echo unknown)

if [ "$BOOK_ROWS" = "0" ]; then
  echo "Seeding database (BookRecipe пуста)..."
  npx prisma db seed || echo "Seed skipped or failed"
else
  echo "BookRecipe уже заполнена (строк: $BOOK_ROWS) — сид пропускаем."
fi

echo "Starting server..."
exec "$@"
