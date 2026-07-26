const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// I know the state-now call is at 387405. Let me get wider context
console.log("=== State-now call context ===");
console.log(content.substring(387000, 388000));
