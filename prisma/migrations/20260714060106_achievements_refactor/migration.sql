-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "availableFromDay" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastAchievementUnlockedAt" TIMESTAMP(3),
ADD COLUMN     "pendingAchievementId" TEXT;
