-- DropForeignKey
ALTER TABLE "ShoppingItem" DROP CONSTRAINT "ShoppingItem_userId_fkey";

-- CreateTable
CREATE TABLE "FoodItem" (
    "id" TEXT NOT NULL,
    "fdcId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "russianName" TEXT,
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiber" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iron" DOUBLE PRECISION,
    "zinc" DOUBLE PRECISION,
    "magnesium" DOUBLE PRECISION,
    "iodine" DOUBLE PRECISION,
    "selenium" DOUBLE PRECISION,
    "vitaminC" DOUBLE PRECISION,
    "vitaminB9" DOUBLE PRECISION,
    "lysine" DOUBLE PRECISION,
    "methionine" DOUBLE PRECISION,
    "wfpbStatus" TEXT NOT NULL DEFAULT 'grey',

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodItem_fdcId_key" ON "FoodItem"("fdcId");

-- CreateIndex
CREATE INDEX "FoodItem_name_idx" ON "FoodItem"("name");

-- CreateIndex
CREATE INDEX "FoodItem_russianName_idx" ON "FoodItem"("russianName");

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
