const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Get more context around the bi definition
console.log("=== Context around bi definition ===");
console.log(content.substring(1972400, 1972700));
