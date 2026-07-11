const fs = require('fs');
const path = 'src/components/StateNowScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update energyPct to use activityLogs instead of effRatingEnergy
content = content.replace(
  '  const energyPct = effRatingEnergy * 20;',
  '  const energyPct = Math.min(100, activityLogs.length * 20); // 1 div = 20%'
);

// We should also pass `activityLogs` to ScalesTab if not already doing so
// wait, we already do pass it.

fs.writeFileSync(path, content);
console.log("StateNowScreen.tsx energyPct patched.");
