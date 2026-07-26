const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Try without quotes - just the endpoint path
let idx = -1;
let count = 0;
while ((idx = content.indexOf("/api/metrics/daily", idx + 1)) !== -1 && count < 10) {
  const start = Math.max(0, idx - 80);
  const end = Math.min(content.length, idx + 300);
  console.log(`\n=== /api/metrics/daily at ${idx} ===`);
  console.log(content.substring(start, end));
  count++;
}
