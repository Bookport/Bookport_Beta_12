const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the component function that starts the analytics screen
// Look around 1985000 for the function declaration
console.log("=== Area 1984000-1986000 ===");
console.log(content.substring(1984000, 1986000));
