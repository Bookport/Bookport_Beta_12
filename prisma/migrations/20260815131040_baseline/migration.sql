-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

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
    "courseStartDate" TIMESTAMP(3),
    "currentDayIndex" INTEGER NOT NULL DEFAULT 1,
    "lastActiveDate" TIMESTAMP(3),
    "ritualTime" TEXT DEFAULT '21:00',
    "lastAchievementUnlockedAt" TIMESTAMP(3),
    "pendingAchievementId" TEXT,
    "constructorCount" INTEGER NOT NULL DEFAULT 0,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "chapterReadCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "feedbackCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "compositionViewLog" TEXT DEFAULT '[]',
    "annaDislikeCount" INTEGER NOT NULL DEFAULT 0,
    "annaChatCount" INTEGER NOT NULL DEFAULT 0,
    "globalProgress" INTEGER NOT NULL DEFAULT 0,
    "telegramId" TEXT,
    "telegramName" TEXT,
    "telegramUsername" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "clubLinkedAt" TIMESTAMP(3),
    "accessExpiresAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "telegramId" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accessStartsAt" TIMESTAMP(3),
    "externalOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppLaunchToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "telegramId" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppLaunchToken_pkey" PRIMARY KEY ("id")
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
    "steps" INTEGER NOT NULL DEFAULT 0,
    "waterEntries" TEXT,
    "sleepLogs" TEXT,
    "digestionLog" TEXT,
    "movementLog" TEXT,
    "measurements" TEXT,
    "pulse" INTEGER,
    "weight" DOUBLE PRECISION,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "tonus" TEXT,
    "dayMood" TEXT,
    "dayBookmark" TEXT,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyMetricId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dayIndex" INTEGER NOT NULL,
    "timeInterval" TEXT,
    "timeString" TEXT,
    "bristolType" INTEGER NOT NULL DEFAULT 4,
    "comfort" TEXT NOT NULL DEFAULT 'Нормально',
    "symptoms" TEXT[],
    "note" TEXT,
    "linkedMeal" TEXT,
    "timestamp" BIGINT,

    CONSTRAINT "DigestionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wellbeing" INTEGER NOT NULL,
    "energy" INTEGER NOT NULL,
    "lightness" INTEGER NOT NULL,
    "wellbeingLog" TEXT,
    "energyLog" TEXT,
    "lightnessLog" TEXT,

    CONSTRAINT "DailyRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookRecipe" (
    "type" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "technicalName" TEXT NOT NULL,
    "page" INTEGER,
    "day" INTEGER,
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
    "dayIndex" INTEGER,
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
    "water" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbohydrates" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sugarTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sucrose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "glucose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fructose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lactose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maltose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saturatedFat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monounsaturatedFat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "polyunsaturatedFat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transFat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cholesterol" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "omega3" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "omega6" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "omega9" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calcium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iron" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "magnesium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phosphorus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "potassium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sodium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zinc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "copper" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manganese" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iodine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "selenium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thiamin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riboflavin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "niacin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pantothenicAcid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminB6" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biotin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "folate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminB12" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retinol" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "betaCarotene" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminD2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminD3" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminE" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminK" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lysine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "methionine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tryptophan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "threonine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isoleucine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leucine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cystine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phenylalanine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tyrosine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "arginine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "histidine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alanine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "asparticAcid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "glutamicAcid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "glycine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proline" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serine" DOUBLE PRECISION NOT NULL DEFAULT 0,

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
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "imageUrl" TEXT,
    "verdictStatus" TEXT NOT NULL DEFAULT 'green',
    "checked" BOOLEAN NOT NULL DEFAULT false,
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
    "availableFromDay" INTEGER NOT NULL DEFAULT 1,

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

-- CreateTable
CREATE TABLE "FoodItem" (
    "id" TEXT NOT NULL,
    "fdcId" INTEGER,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "wfpbStatus" TEXT NOT NULL DEFAULT 'green',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbohydrates" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "water" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiber" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sugarTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sucrose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "glucose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fructose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lactose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maltose" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saturatedFat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monounsaturatedFat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "polyunsaturatedFat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transFat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cholesterol" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "omega3" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "omega6" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "omega9" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calcium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iron" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "magnesium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phosphorus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "potassium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sodium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zinc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "copper" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manganese" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iodine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "selenium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thiamin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riboflavin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "niacin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pantothenicAcid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminB6" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biotin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "folate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminB12" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retinol" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "betaCarotene" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminD2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminD3" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminE" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vitaminK" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lysine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "methionine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tryptophan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "threonine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isoleucine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leucine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cystine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phenylalanine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tyrosine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "arginine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "histidine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alanine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "asparticAcid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "glutamicAcid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "glycine" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proline" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serine" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseToken_token_key" ON "PurchaseToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "AppLaunchToken_token_key" ON "AppLaunchToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_userId_date_key" ON "DailyMetric"("userId", "date");

-- CreateIndex
CREATE INDEX "DigestionLog_userId_dayIndex_idx" ON "DigestionLog"("userId", "dayIndex");

-- CreateIndex
CREATE INDEX "DigestionLog_dailyMetricId_idx" ON "DigestionLog"("dailyMetricId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRating_userId_date_key" ON "DailyRating"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeProgress_userId_bookRecipeType_bookRecipeId_key" ON "RecipeProgress"("userId", "bookRecipeType", "bookRecipeId");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodItem_nameRu_key" ON "FoodItem"("nameRu");

-- CreateIndex
CREATE INDEX "FoodItem_nameRu_idx" ON "FoodItem"("nameRu");

-- CreateIndex
CREATE INDEX "FoodItem_nameEn_idx" ON "FoodItem"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "EveningRitual_userId_dayIndex_key" ON "EveningRitual"("userId", "dayIndex");

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestionLog" ADD CONSTRAINT "DigestionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestionLog" ADD CONSTRAINT "DigestionLog_dailyMetricId_fkey" FOREIGN KEY ("dailyMetricId") REFERENCES "DailyMetric"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "EveningRitual" ADD CONSTRAINT "EveningRitual_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

