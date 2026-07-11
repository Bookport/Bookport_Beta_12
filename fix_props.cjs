const fs = require('fs');
const path = 'src/components/StateNowScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('todayWaterEntries={waterLogData.todayWaterEntries}')) {
  content = content.replace(
    '              activityLogs={activityLogs}',
    '              activityLogs={activityLogs}\n              todayWaterEntries={waterLogData.todayWaterEntries}'
  );
  fs.writeFileSync(path, content);
  console.log("Injected todayWaterEntries prop!");
} else {
  console.log("Already has it.");
}
