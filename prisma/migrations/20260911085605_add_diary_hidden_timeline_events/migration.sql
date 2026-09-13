-- CreateTable
CREATE TABLE "DiaryHiddenTimelineEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryHiddenTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiaryHiddenTimelineEvent_userId_idx" ON "DiaryHiddenTimelineEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryHiddenTimelineEvent_userId_eventId_key" ON "DiaryHiddenTimelineEvent"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "DiaryHiddenTimelineEvent" ADD CONSTRAINT "DiaryHiddenTimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
