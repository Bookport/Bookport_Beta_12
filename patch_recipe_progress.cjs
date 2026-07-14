const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'res.json({ success: true, progress: record });',
  'res.json({ success: true, progress: record });\n      checkBackgroundAchievements(req.userId, "recipe_progress", req.body);'
);

fs.writeFileSync('server.ts', content, 'utf8');
console.log("Patched recipe progress.");
