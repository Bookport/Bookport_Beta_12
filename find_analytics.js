const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the main analytics component around the tabs
// Look at index 2007000-2009000 where tabs are rendered
console.log("=== TAB BAR RENDER AREA ===");
console.log(content.substring(2007000, 2009300));
