const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Get wider context around the integral calculation
console.log("=== Integral Formula Context ===");
console.log(content.substring(851750, 852200));

// Also find the S8 function (the integral calculator)
console.log("\n\n=== S8 function definition area ===");
// Search for "function S8" or "S8="
let idx = content.indexOf("S8(");
if (idx === -1) idx = content.indexOf("S8=");
if (idx === -1) idx = content.indexOf("S8(");
console.log(content.substring(Math.max(0,idx-200), Math.min(content.length, idx+200)));

// Also look for around 1972961 where mn= is assigned
console.log("\n\n=== mn calculation area ===");
console.log(content.substring(1972850, 1973100));
