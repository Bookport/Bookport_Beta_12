const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the integralScore calculation
console.log("=== AREA 1997000-2000000 ===");
console.log(content.substring(1997000, 2000000));
