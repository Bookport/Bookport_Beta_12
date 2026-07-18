-- AlterTable: add achievement tracking and social fields to User
ALTER TABLE "User" ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "compositionViewLog" TEXT DEFAULT '[]';
ALTER TABLE "User" ADD COLUMN "annaDislikeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "annaChatCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramName" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "clubToken" TEXT;
ALTER TABLE "User" ADD COLUMN "clubTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "clubLinkedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
