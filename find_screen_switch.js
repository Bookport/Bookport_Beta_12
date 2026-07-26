const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Search for the screen switch that renders the analytics
// Look for "analytics" or where the analytics component is called
const searches = [
  '"analytics"', '"stateNow"', '"state-now"',  
  'setScreen', 'my-day',
  'gO(', 'gO={', 'gO ',
];

for (const s of searches) {
  let idx = -1;
  let count = 0;
  while ((idx = content.indexOf(s, idx + 1)) !== -1 && count < 5) {
    if (idx > 925000 && idx < 975000) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(content.length, idx + 200);
      console.log(`\n=== '${s}' at ${idx} ===`);
      console.log(content.substring(start, end));
      count++;
    }
  }
}
