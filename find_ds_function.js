const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// The Ds function generates Anna analysis text. Let me find its definition.
// I know it produces text at 1977447, 1983566, 1980785 etc.
// Let me search from index 1975000 to 1996000 to find the function signature

// Look for patterns like: (he)=>{  or he=>{  that start the text generation
// The pattern I see is: he==="balance" conditions

// Let's extract 1975000-1980000 to see the function boundary
console.log("=== Text generation block around 1977000 ===\n");
console.log(content.substring(1977000, 1980000));

console.log("\n\n=== Text generation block around 1983500 ===\n");
console.log(content.substring(1983500, 1985500));
