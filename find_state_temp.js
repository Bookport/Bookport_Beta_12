const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');
console.log("=== STATE-NOW CALL AREA ===");
console.log(content.substring(387300, 389000));
