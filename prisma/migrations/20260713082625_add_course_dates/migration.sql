-- AlterTable
ALTER TABLE "User" ADD COLUMN     "courseStartDate" TIMESTAMP(3),
ADD COLUMN     "currentDayIndex" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastActiveDate" TIMESTAMP(3);
