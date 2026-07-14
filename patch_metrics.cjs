const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'res.json({ success: true, dailyMetric });',
  'res.json({ success: true, dailyMetric });\n      // Background achievements check\n      checkBackgroundAchievements(req.userId, "metric_saved", data);'
);
fs.writeFileSync('server.ts', content, 'utf8');
console.log("Patched daily metrics endpoint.");
