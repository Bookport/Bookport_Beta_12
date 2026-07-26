const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// The analytics component with integral ring starts before 2000000
// Let me search for what function/variable wraps this component
// Look for the component function name in the area just before the ring

console.log("=== Searching for component function before ring ===");
// Look for: function declarations, arrow functions, or variable assignments
// that have the integral index render inside them

// Search backwards from 2000000 for the component boundary
const section = content.substring(1993000, 2000000);
console.log("Section begins with:", section.substring(0, 100));

// Look for a function or arrow pattern that seems to be the component wrapper
const funcMatch = section.match(/[,({]=>\s*e\.jsx|[,({]\(\s*\)\s*=>|function\s+\w+\([^)]+\)/g);
if (funcMatch) {
  console.log("Found function patterns:", funcMatch.slice(0, 5));
}

// Let me also look at the area around 1996000 where state variables are used
console.log("\n\n=== State variable definitions at 1996000-1997000 ===");
console.log(content.substring(1995700, 1996000));
