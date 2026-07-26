const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// The Ds function that generates Anna analysis text
// Let me search for where the analysis texts are defined
// Look for ea function around index 1987671

console.log("=== ea function (question labels) ===");
console.log(content.substring(1987670, 1988000));

// Also search for the ls function that was referenced
console.log("\n\n=== Searching for ls(...) pattern ===");
const lsPattern = /ls\(/g;
let m, count = 0;
while ((m = lsPattern.exec(content)) !== null && count < 10) {
  const start = Math.max(0, m.index - 30);
  const end = Math.min(content.length, m.index + 200);
  console.log(`\n--- ls() at ${m.index} ---`);
  console.log(content.substring(start, end));
  count++;
}
