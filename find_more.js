const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Search for evening ritual transformation trigger
// Look for ritualTime comparisons, evening transformations
const searches = [
  'ritualTime', 'ritual', 
  'evening', 'вечерн', 'вечер',
  'трансформац',
  'Натрий', 'калий', 'натрия', 'калия',
  'Системные взаимосвязи', 'взаимосвяз',
  'Ресурс', 'Зависимость',
  'сон', 'вода', 'баланс'
];

for (const s of searches) {
  let idx = -1;
  let count = 0;
  while ((idx = content.indexOf(s, idx + 1)) !== -1 && count < 5) {
    // Focus on analytics area (1900000-2100000)
    if (idx > 1800000 && idx < 2100000) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(content.length, idx + 200);
      console.log(`\n=== '${s}' at ${idx} ===`);
      console.log(content.substring(start, end));
      count++;
    }
  }
}
