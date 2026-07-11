const fs = require('fs');
const path = '/home/sam/code/coder/Bookport_12.0_Beta/src/components/StateNowScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove from top
content = content.replace('  const effMealCount = cookedBookDishes.length + todayCustomDishes.length;\n', '');

// Add before mealsPct
const targetLine = `  // Percentage estimations
  const waterPct = Math.min(100, Math.round((effWater / waterTarget) * 100));`;
const replacement = `  const effMealCount = cookedBookDishes.length + todayCustomDishes.length;

  // Percentage estimations
  const waterPct = Math.min(100, Math.round((effWater / waterTarget) * 100));`;

content = content.replace(targetLine, replacement);

fs.writeFileSync(path, content);
console.log("StateNowScreen fixed ReferenceError!");
