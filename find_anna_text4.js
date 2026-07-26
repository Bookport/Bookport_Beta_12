const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Search for Russian text patterns in Anna's analysis
const patterns = [
  'калорийность', 'белок', 'ккал', 'витамин С', 'витамин',
  'гидратац', 'Баланс воды',
  'сегодня', 'рекомендац',
  // Specific patterns from the user's description
  '7.5', '26.4', '238',
  'stringBuilder', 'template',
  'font-normal leading-relaxed' // common text render class
];

for (const p of patterns) {
  let idx = -1;
  let count = 0;
  // search in the analytics area (1900000-2100000)
  while ((idx = content.indexOf(p, idx + 1)) !== -1 && count < 6) {
    if (idx > 1900000 && idx < 2100000) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(content.length, idx + 200);
      console.log(`\n=== '${p}' at ${idx} ===`);
      console.log(content.substring(start, end));
      count++;
    }
  }
}
