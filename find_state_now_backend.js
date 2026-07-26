const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// The analytics component starts with useState declarations.
// Let me search for the beginning - look for the pattern where
// userProfile, water, sleep, etc. are first destructured/created
console.log("=== State initialization in analytics component ===");
console.log(content.substring(1990000, 1993050));
