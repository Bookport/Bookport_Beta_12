const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Full S8 function
let idx = content.indexOf("function S8(a)");
if (idx === -1) idx = content.indexOf("S8(a)");
console.log("=== Full S8 function ===");
console.log(content.substring(idx, idx + 800));

// Full mn area
console.log("\n\n=== Full mn/S8 call area ===");
console.log(content.substring(1972900, 1973400));
