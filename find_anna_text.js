const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find Ds - the Anna analysis text generator
// Ds("balance"), Ds("scales"), etc.
let idx = content.indexOf("Ds=he=>{");
if (idx === -1) idx = content.indexOf("Ds=");
console.log("=== Ds function start ===");
console.log(content.substring(Math.max(0, idx - 50), Math.min(content.length, idx + 1000)));

// Also search for Anna analysis texts
const searches = [
  'Ds("balance")', 'Ds("scales")', 'Ds("kbju")', 'Ds("micro")', 'Ds("composition")', 'Ds("dynamics")',
  'annaAnalysis', 'getAnnaAnalysis'
];

for (const s of searches) {
  let idx2 = -1;
  let count = 0;
  while ((idx2 = content.indexOf(s, idx2 + 1)) !== -1 && count < 3) {
    const start = Math.max(0, idx2 - 30);
    const end = Math.min(content.length, idx2 + 100);
    console.log(`\n=== '${s}' at ${idx2} ===\n${content.substring(start, end)}`);
    count++;
  }
}
