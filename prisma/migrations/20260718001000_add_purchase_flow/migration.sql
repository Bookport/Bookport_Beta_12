-- AlterTable: add purchasedAt to User
ALTER TABLE "User" ADD COLUMN "purchasedAt" TIMESTAMP(3);

-- CreateTable: PurchaseToken
CREATE TABLE "PurchaseToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "telegramId" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseToken_token_key" ON "PurchaseToken"("token");
