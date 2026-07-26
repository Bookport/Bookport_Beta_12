const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Extract the screen switch around "state-now" at index 2152430
console.log("=== Screen switch area ===");
console.log(content.substring(2152200, 2152800));
