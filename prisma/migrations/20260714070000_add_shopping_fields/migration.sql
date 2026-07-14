-- AlterTable: add new columns
ALTER TABLE "ShoppingItem" ADD COLUMN "barcode" TEXT;
ALTER TABLE "ShoppingItem" ADD COLUMN "brand" TEXT;
ALTER TABLE "ShoppingItem" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "ShoppingItem" ADD COLUMN "verdictStatus" TEXT NOT NULL DEFAULT 'green';

-- Migrate existing data: copy category → brand
UPDATE "ShoppingItem" SET "brand" = "category" WHERE "category" IS NOT NULL;

-- Drop deprecated columns
ALTER TABLE "ShoppingItem" DROP COLUMN "category";
ALTER TABLE "ShoppingItem" DROP COLUMN "dayIndex";

-- Re-create foreign key with onDelete: Cascade
ALTER TABLE "ShoppingItem" DROP CONSTRAINT "ShoppingItem_userId_fkey";
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
