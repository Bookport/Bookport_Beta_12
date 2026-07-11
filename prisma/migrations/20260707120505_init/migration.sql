-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "gender" TEXT,
    "age" INTEGER,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "initialAge" INTEGER,
    "initialHeight" DOUBLE PRECISION,
    "initialWeight" DOUBLE PRECISION,
    "initialSystolic" INTEGER,
    "initialDiastolic" INTEGER,
    "hasSavedSettings" BOOLEAN NOT NULL DEFAULT false,
    "chronicConditions" TEXT,
    "healthGoals" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dayIndex" INTEGER NOT NULL,
    "waterMl" INTEGER NOT NULL DEFAULT 0,
    "sleepMinutes" INTEGER NOT NULL DEFAULT 0,
    "mealCount" INTEGER NOT NULL DEFAULT 0,
    "habitsDone" INTEGER NOT NULL DEFAULT 0,
    "activityMinutes" INTEGER NOT NULL DEFAULT 0,
    "digestionLog" TEXT,
    "movementLog" TEXT,
    "measurements" TEXT,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wellbeing" INTEGER NOT NULL,
    "energy" INTEGER NOT NULL,
    "lightness" INTEGER NOT NULL,

    CONSTRAINT "DailyRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookRecipe" (
    "type" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "technicalName" TEXT NOT NULL,
    "emotionalName" TEXT,
    "week" TEXT,
    "page" INTEGER,
    "day" INTEGER,
    "timeOfDay" TEXT,
    "ingredients" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "kbju" TEXT NOT NULL,

    CONSTRAINT "BookRecipe_pkey" PRIMARY KEY ("type","id")
);

-- CreateTable
CREATE TABLE "RecipeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookRecipeType" TEXT NOT NULL,
    "bookRecipeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'base',
    "note" TEXT,
    "tags" TEXT,
    "dayIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedDish" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "category" TEXT NOT NULL,
    "tag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isBookRecipe" BOOLEAN NOT NULL DEFAULT false,
    "bookRecipeType" TEXT,
    "bookRecipeId" INTEGER,
    "sourceType" TEXT,
    "ingredients" TEXT,
    "calories" INTEGER,
    "protein" TEXT,
    "fiber" TEXT,
    "fat" TEXT,
    "annaTip" TEXT,
    "annaComment" TEXT,
    "isNew" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SavedDish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "mood" TEXT,
    "photo" TEXT,
    "tags" TEXT,
    "time" TEXT,

    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "dayIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dayIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnaChat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "reply" TEXT,
    "screen" TEXT,
    "dayIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnaChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnaOverlayMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "time" TEXT,
    "dayIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnaOverlayMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "descriptionMale" TEXT NOT NULL,
    "descriptionFemale" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3),
    "xp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_userId_date_key" ON "DailyMetric"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRating_userId_date_key" ON "DailyRating"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeProgress_userId_bookRecipeType_bookRecipeId_key" ON "RecipeProgress"("userId", "bookRecipeType", "bookRecipeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRating" ADD CONSTRAINT "DailyRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeProgress" ADD CONSTRAINT "RecipeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeProgress" ADD CONSTRAINT "RecipeProgress_bookRecipeType_bookRecipeId_fkey" FOREIGN KEY ("bookRecipeType", "bookRecipeId") REFERENCES "BookRecipe"("type", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedDish" ADD CONSTRAINT "SavedDish_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnaChat" ADD CONSTRAINT "AnnaChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnaOverlayMessage" ADD CONSTRAINT "AnnaOverlayMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
