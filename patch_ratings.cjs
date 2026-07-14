const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'res.json({ success: true, rating });',
  'res.json({ success: true, rating });\n      checkBackgroundAchievements(req.userId, "rating_saved", req.body);'
);

// Add rating condition to checkBackgroundAchievements
content = content.replace(
  '// Note: To check daily wellbeing == 1',
  'if (eventType === "rating_saved" && data && data.wellbeing === 1) tryUnlock("ach-050", true);\n       // Note: To check daily wellbeing == 1'
);

fs.writeFileSync('server.ts', content, 'utf8');
console.log("Patched ratings.");
