const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'res.json({ success: true, user });',
  'res.json({ success: true, user });\n      // Background achievements check\n      checkBackgroundAchievements(req.userId, "profile_saved", data);'
);
fs.writeFileSync('server.ts', content, 'utf8');
console.log("Patched profile endpoint.");
