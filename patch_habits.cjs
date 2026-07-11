const fs = require('fs');
const path = 'src/components/StateNowScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add import
if (!content.includes('import { SystemKeysStore }')) {
  content = content.replace(
    'import { DailyNutritionStore } from "../services/DailyNutritionStore";',
    'import { DailyNutritionStore } from "../services/DailyNutritionStore";\nimport { SystemKeysStore } from "../services/SystemKeysStore";'
  );
}

// 2. Remove old effHabitsDone
content = content.replace('  const effHabitsDone = apiStateNowData?.dailyMetric?.habitsDone ?? habitsDone;\n', '');

// 3. Add new effHabitsDone after effSavedDishes
const targetLine = '  const effSavedDishes = savedDishes.length ? savedDishes : (apiStateNowData?.savedDishes || []);';
const replacement = targetLine + '\n  const effHabitsDone = SystemKeysStore.calculateKeysForDay(currentDayIndex || 1, effSavedDishes, effWater).closedCount;';
if (!content.includes('SystemKeysStore.calculateKeysForDay(currentDayIndex')) {
    content = content.replace(targetLine, replacement);
}

fs.writeFileSync(path, content);
console.log("Patched successfully.");
