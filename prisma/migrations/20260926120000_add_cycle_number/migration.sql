-- Этап 0: закрывает разрыв между книгой миграций и schema.prisma.
-- Колонка цикла курса и индексы по ней есть в схеме и в рабочей dev-базе,
-- но ни одна миграция их не создаёт: чистая боевая база после `migrate deploy` их не получает.
-- DDL идемпотентен, чтобы миграция прошла и на чистой базе, и на dev-базе, где эти объекты уже есть.

-- AlterTable: 7 таблиц, значение по умолчанию совпадает со схемой (@default(1))
ALTER TABLE "AnnaChat" ADD COLUMN IF NOT EXISTS "cycleNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DailyMetric" ADD COLUMN IF NOT EXISTS "cycleNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DailyRating" ADD COLUMN IF NOT EXISTS "cycleNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DiaryEntry" ADD COLUMN IF NOT EXISTS "cycleNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "RecipeProgress" ADD COLUMN IF NOT EXISTS "cycleNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SavedDish" ADD COLUMN IF NOT EXISTS "cycleNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cycleNumber" INTEGER NOT NULL DEFAULT 1;

-- DropIndex: уникальность без номера цикла, схема их больше не объявляет
DROP INDEX IF EXISTS "DailyMetric_userId_date_key";
DROP INDEX IF EXISTS "DailyRating_userId_date_key";
DROP INDEX IF EXISTS "RecipeProgress_userId_bookRecipeType_bookRecipeId_key";

-- CreateIndex: 6 обычных + 3 уникальных, имена и состав — как генерирует Prisma
CREATE INDEX IF NOT EXISTS "AnnaChat_userId_cycleNumber_idx" ON "AnnaChat"("userId", "cycleNumber");
CREATE INDEX IF NOT EXISTS "DailyMetric_userId_cycleNumber_idx" ON "DailyMetric"("userId", "cycleNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "DailyMetric_userId_cycleNumber_date_key" ON "DailyMetric"("userId", "cycleNumber", "date");
CREATE INDEX IF NOT EXISTS "DailyRating_userId_cycleNumber_idx" ON "DailyRating"("userId", "cycleNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "DailyRating_userId_cycleNumber_date_key" ON "DailyRating"("userId", "cycleNumber", "date");
CREATE INDEX IF NOT EXISTS "DiaryEntry_userId_cycleNumber_idx" ON "DiaryEntry"("userId", "cycleNumber");
CREATE INDEX IF NOT EXISTS "RecipeProgress_userId_cycleNumber_idx" ON "RecipeProgress"("userId", "cycleNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "RecipeProgress_userId_cycleNumber_bookRecipeType_bookRecipe_key" ON "RecipeProgress"("userId", "cycleNumber", "bookRecipeType", "bookRecipeId");
CREATE INDEX IF NOT EXISTS "SavedDish_userId_cycleNumber_idx" ON "SavedDish"("userId", "cycleNumber");
