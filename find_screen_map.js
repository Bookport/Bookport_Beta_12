const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the main screen mapping - look for patterns like Map or switch
// that maps screen names to components
// Try searching in the top-level app component

// Search for where the string "state-now" appears in context of render/component
let idx = 0;
const results = [];
while ((idx = content.indexOf('"state-now"', idx + 1)) !== -1) {
  results.push({ idx, context: content.substring(Math.max(0, idx - 150), Math.min(content.length, idx + 150)) });
}
console.log(`Found ${results.length} occurrences of "state-now":`);
results.forEach((r, i) => {
  console.log(`\n=== #${i} at ${r.idx} ===\n${r.context}`);
  console.log("---");
});
