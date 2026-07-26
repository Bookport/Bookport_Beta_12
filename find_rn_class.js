const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Get the full Rn class
let rnStart = content.indexOf("class Rn");
console.log("=== Rn class ===");
console.log(content.substring(rnStart, rnStart + 3000));

// Also find actionKeys array
console.log("\n\n=== Search for action keys ===");
const patterns = [
  '"action"', 'category:"action"', 
  '"compliment_of_day"', '"recipe_of_day"', 
  '"no_oil"', '"no_salt"', '"no_caffeine"', '"no_sugar"',
  'actionItems', 'actionKeys',
  'optimalDone'
];
for (const s of patterns) {
  let idx = -1;
  let count = 0;
  while ((idx = content.indexOf(s, idx + 1)) !== -1 && count < 3) {
    if (idx > 840000 && idx < 1050000) {
      const start = Math.max(0, idx - 50);
      const end = Math.min(content.length, idx + 150);
      console.log(`\n--- '${s}' at ${idx} ---`);
      console.log(content.substring(start, end));
      count++;
    }
  }
}
