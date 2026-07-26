const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Search for time conditions in the analytics component
// Look for patterns like "new Date().getHours", "Date.now", hour comparison
const searches = [
  '.getHours()', '.getMinutes()', 'Date().getHours',
  'localHour', 'currentHour', 'nowHour',
  'bi', // bi seems to be a boolean for evening mode (seen in ls function)
  'ha'  // ha was used for hours remaining in ls function
];

for (const s of searches) {
  let idx = -1;
  let count = 0;
  while ((idx = content.indexOf(s, idx + 1)) !== -1 && count < 5) {
    if (idx > 1995000 && idx < 2015000) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(content.length, idx + 200);
      console.log(`\n=== '${s}' at ${idx} ===`);
      console.log(content.substring(start, end));
      count++;
    }
  }
}
