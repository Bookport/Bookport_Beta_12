const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the action keys (hO) and the manual interaction flow
console.log("=== Action keys (hO) ===");
console.log(content.substring(1039970, 1040150));

// Find where manual toggle is saved
console.log("\n\n=== updateManualKey function ===");
console.log(content.substring(850580, 850750));

// Find the POST habits endpoint
console.log("\n\n=== POST habits endpoint search ===");
const idx = content.indexOf("/api/metrics/habit");
if (idx > 0) console.log(content.substring(Math.max(0, idx-50), idx + 100));
else console.log("NOT FOUND");

// Find how habitsDone is sent to backend
console.log("\n\n=== habitsDone in metrics/daily POST ===");
let idx2 = -1;
let count = 0;
while ((idx2 = content.indexOf("habitsDone", idx2 + 1)) !== -1 && count < 10) {
  const start = Math.max(0, idx2 - 60);
  const end = Math.min(content.length, idx2 + 80);
  console.log(`\n--- at ${idx2} ---`);
  console.log(content.substring(start, end));
  count++;
}
