-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ritualTime" TEXT DEFAULT '21:00';

-- CreateTable
CREATE TABLE "EveningRitual" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "answerBody" TEXT NOT NULL,
    "answerPsycho" TEXT NOT NULL,
    "answerUnexpected" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EveningRitual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EveningRitual_userId_dayIndex_key" ON "EveningRitual"("userId", "dayIndex");

-- AddForeignKey
ALTER TABLE "EveningRitual" ADD CONSTRAINT "EveningRitual_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
