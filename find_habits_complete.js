const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Get the complete action keys array
console.log("=== Action keys (full) ===");
// Search from "compliment" action definition back to the start of the array
let idx = content.indexOf('"compliment"');
if (idx > 0) {
  // Find the start by going back to the previous [ or ,
  const start = content.lastIndexOf('[', idx);
  const end = content.indexOf(']', idx) + 1;
  console.log(content.substring(Math.max(0, start - 100), end + 100));
}

// Get the component's save function - where habitsDone is sent
console.log("\n\n=== xO component save function ===");
const xOidx = content.indexOf("function xO(");
if (xOidx > 0) {
  const saveFunc = content.indexOf("rs(", xOidx);
  if (saveFunc > 0) {
    const end = Math.min(content.length, saveFunc + 300);
    console.log(content.substring(Math.max(0, saveFunc - 80), end));
  }
}

// Check if there's a POST /api/metrics/habits endpoint
console.log("\n\n=== Search for habits-related API ===");
const searches = ['/api/metrics/habit', '"habits"', 'habits/', 'habitsDone', 'synced_habits'];
for (const s of searches) {
  let i = -1;
  let count = 0;
  while ((i = content.indexOf(s, i + 1)) !== -1 && count < 5) {
    if (i > 1040000 && i < 1050000) {
      const start = Math.max(0, i - 60);
      const end = Math.min(content.length, i + 120);
      console.log(`\n--- '${s}' at ${i} ---`);
      console.log(content.substring(start, end));
      count++;
    }
  }
}
