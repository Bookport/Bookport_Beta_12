const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the analytics parent component - look before tab render
// Look at 2003000-2007000 to find integralScore calculation
console.log("=== BEFORE TAB RENDER (integral area) ===");
console.log(content.substring(2003000, 2004500));
