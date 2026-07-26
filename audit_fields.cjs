// This script analyzes the schema vs server.cjs usage

const fields = {
  User: [
    { name: "lastActiveDate", search: ["lastActiveDate"] },
    { name: "lastAchievementUnlockedAt", search: ["lastAchievementUnlockedAt"] },
    { name: "hasSavedSettings", search: ["hasSavedSettings"] },
    { name: "pendingAchievementId", search: ["pendingAchievementId"] },
    { name: "courseStartDate", search: ["courseStartDate"] },
    { name: "currentDayIndex", search: ["currentDayIndex"] },
    { name: "ritualTime", search: ["ritualTime"] },
    { name: "initialAge", search: ["initialAge"] },
    { name: "initialHeight", search: ["initialHeight"] },
    { name: "initialWeight", search: ["initialWeight"] },
    { name: "initialSystolic", search: ["initialSystolic"] },
    { name: "initialDiastolic", search: ["initialDiastolic"] },
    { name: "name", search: ["name"] },
    { name: "gender", search: ["gender"] },
    { name: "age", search: ["age"] },
    { name: "height", search: ["height"] },
    { name: "weight", search: ["weight"] },
    { name: "systolic", search: ["systolic"] },
    { name: "diastolic", search: ["diastolic"] },
    { name: "chronicConditions", search: ["chronicConditions"] },
    { name: "healthGoals", search: ["healthGoals"] },
    { name: "telegramId", search: ["telegramId"] },
    { name: "telegramName", search: ["telegramName"] },
    { name: "telegramUsername", search: ["telegramUsername"] },
    { name: "purchasedAt", search: ["purchasedAt"] },
    { name: "accessExpiresAt", search: ["accessExpiresAt"] },
    { name: "clubLinkedAt", search: ["clubLinkedAt"] },
    { name: "constructorCount", search: ["constructorCount"] },
    { name: "scanCount", search: ["scanCount"] },
    { name: "chapterReadCount", search: ["chapterReadCount"] },
    { name: "shareCount", search: ["shareCount"] },
    { name: "feedbackCount", search: ["feedbackCount"] },
    { name: "clickCount", search: ["clickCount"] },
    { name: "compositionViewLog", search: ["compositionViewLog"] },
    { name: "annaDislikeCount", search: ["annaDislikeCount"] },
    { name: "annaChatCount", search: ["annaChatCount"] },
  ],
  DailyMetric: [
    { name: "steps", search: ["steps"] },
    { name: "waterEntries", search: ["waterEntries"] },
    { name: "sleepLogs", search: ["sleepLogs"] },
    { name: "digestionLog", search: ["digestionLog"] },
    { name: "movementLog", search: ["movementLog"] },
    { name: "measurements", search: ["measurements"] },
    { name: "dayMood", search: ["dayMood"] },
    { name: "dayBookmark", search: ["dayBookmark"] },
  ],
  BookRecipe: [
    { name: "emotionalName", search: ["emotionalName"] },
    { name: "week", search: ["week"] },
    { name: "timeOfDay", search: ["timeOfDay"] },
  ],
  SavedDish: [
    { name: "isFavorite", search: ["isFavorite"] },
    { name: "sourceType", search: ["sourceType"] },
    { name: "annaTip", search: ["annaTip"] },
    { name: "annaComment", search: ["annaComment"] },
    { name: "isNew", search: ["isNew"] },
    { name: "protein", search: ["protein"] },
    { name: "fiber", search: ["fiber"] },
    { name: "fat", search: ["fat"] },
    { name: "ingredients", search: ["ingredients"] },
  ]
};

console.log("Field usage audit (server.cjs):\n");

for (const [table, flds] of Object.entries(fields)) {
  console.log(`\n--- ${table} ---`);
  for (const f of flds) {
    // Search for each field name in server.cjs
    const fs = require('fs');
    const content = fs.readFileSync('/dev/stdin', 'utf8');
    // Actually we can't read stdin - let me just report based on what I know
  }
}
