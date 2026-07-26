const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

const searches = [
  '"Баланс"', '"Шкалы"', '"КБЖУ"', '"Микро"', '"Состав"', '"Динамика"',
  'tabs', 'tabChange', 'activeTab'
];

for (const s of searches) {
  let idx = -1;
  let count = 0;
  while ((idx = content.indexOf(s, idx + 1)) !== -1 && count < 3) {
    const start = Math.max(0, idx - 80);
    const end = Math.min(content.length, idx + 200);
    console.log(`\n=== ${s} at ${idx} ===`);
    console.log(content.substring(start, end));
    count++;
  }
}
