const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the main screen switch - look for where different screen components are rendered
// The main app component should have a switch/if chain for screens like
// "my-day", "diary", "state-now", "book-recipes", "purchases", "anna", "hub"
// Look in the area around 925000-975000 for screen rendering

// Search for where components are conditionally rendered based on screen name
const pattern = /screen.*===[=]?.*["][\w-]+["]/g;
let m, count = 0;
while ((m = pattern.exec(content)) !== null && count < 20) {
  const idx = m.index;
  if (idx > 860000 && idx < 900000) {
    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, idx + 300);
    console.log(`\n=== '${m[0]}' at ${idx} ===`);
    console.log(content.substring(start, end));
    count++;
  }
}

// Also search for where the analytics component (the one with integral index, tabs) is rendered
// The component should have the integral index ring in its render
// Search for "integralScoreGradient" to find render context
let idx2 = content.indexOf("integralScoreGradient");
if (idx2 > 0) {
  const start = Math.max(0, idx2 - 5000);
  const end = idx2;
  console.log("\n\n=== Before integralScoreGradient (looking for component boundary) ===");
  // Find the last function declaration before this
  const beforeSection = content.substring(start, end);
  // Check for patterns like "a===\"state-now\"", "screen===", etc.
  const switchPattern = /["][\w-]+["]\s*===?\s*screen|screen\s*===?\s*["][\w-]+["]/g;
  let m2;
  while ((m2 = switchPattern.exec(beforeSection)) !== null) {
    console.log(`  Found: ${m2[0]} at ${start + m2.index}`);
  }
}
