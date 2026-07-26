const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the analytics component state management
// The component likely starts with a function that has many useState calls
// Let me search for the component by looking for where the analytics data is assembled
// Look at 1988000-1990000 for the beginning of the component

console.log("=== Before the deep-dive analytics ===");
console.log(content.substring(1988000, 1990000));
