const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');
// Area around "Интегральная" and my-page screen
console.log("=== MY-PAGE SCREEN AREA ===");
console.log(content.substring(410000, 412000));
