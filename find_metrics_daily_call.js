const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Search for all rs(/api/metrics/daily calls in the frontend
let idx = -1;
let count = 0;
while ((idx = content.indexOf("rs(/api/metrics/daily", idx + 1)) !== -1 && count < 10) {
  const start = Math.max(0, idx - 100);
  const end = Math.min(content.length, idx + 400);
  console.log(`\n=== rs(/api/metrics/daily at ${idx} ===`);
  console.log(content.substring(start, end));
  count++;
}
