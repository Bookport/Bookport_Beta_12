const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the my-day screen component - it starts near index 929241
console.log("=== My-Day screen component start ===");
console.log(content.substring(928950, 929400));

// Also look for how state-now data is passed to the my-day screen
console.log("\n\n=== After screen switch definition ===");
console.log(content.substring(933300, 933800));
