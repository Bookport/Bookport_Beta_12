const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Search for habits-related code
const searches = [
  'calculateKeysForDay', 'Rn.', 'Rn=',
  'habitsDone', 'habits', 'HABITS',
  'keysForDay', 'KeysForDay',
  '"Продукты"', '"Действия"',
  'Ключей', 'ключей',
  '20 ключей', 'двадцатка',
  'closedCount', 'totalCount',
  'compliments', 'Комплимент', 'compliment',
  'rb', 'Kg', // likely the habits config object
  'legumes', 'whole_grains', 'berries', 'spices',
  'wfpb_compliment', 'keyDone',
  'Съедено', 'авто',
  'productsTab', 'actionsTab'
];

for (const s of searches) {
  let idx = -1;
  let count = 0;
  while ((idx = content.indexOf(s, idx + 1)) !== -1 && count < 5) {
    const start = Math.max(0, idx - 30);
    const end = Math.min(content.length, idx + 150);
    console.log(`\n=== '${s}' at ${idx} ===`);
    console.log(content.substring(start, end));
    count++;
  }
}
