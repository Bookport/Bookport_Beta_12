const fs = require('fs');
const content = fs.readFileSync('/home/sam/code/coder/Bookport_12.0_Beta/src/modules/achievements/config/achievementContent.ts', 'utf8');

const regex = /a\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(`${match[1]} | ${match[3]} | ${match[2]}`);
}
