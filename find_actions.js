const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Get the action keys (hO) and full key configuration
console.log("=== hO array with context ===");
console.log(content.substring(1039970, 1040400));

// Get the component that renders the habits UI
console.log("\n\n=== Habits UI component ===");
console.log(content.substring(1040500, 1041200));

// Get the full Rn class
console.log("\n\n=== Rn class definition ===");
const idx = content.indexOf("class Rn");
if (idx >= 0) {
  console.log("Found at:", idx);
  console.log(content.substring(idx, idx + 100));
}
