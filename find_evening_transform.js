const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the state-now / analytics component time check
// Look for patterns like getHours, Date comparisons, "22", "23", "24",
// time conversion, evening trigger

const searches = [
  'getHours', 'getMinutes', 'currentHour', 
  'localHour', 'hourNow', 
  '"22:', '"23:', '"21:',
  'сейчас', 'noch', 'spät', 
  'isEvening', 'isLate',
  'режим итогов', 'подведени',
  'после', 'вечер', 'ночь',
  'ritualTime'  
];

for (const s of searches) {
  let idx = -1;
  let count = 0;
  while ((idx = content.indexOf(s, idx + 1)) !== -1 && count < 5) {
    if (idx > 1995000 && idx < 2010000) {  // analytics screen area
      const start = Math.max(0, idx - 80);
      const end = Math.min(content.length, idx + 200);
      console.log(`\n=== '${s}' at ${idx} ===`);
      console.log(content.substring(start, end));
      count++;
    }
  }
}
