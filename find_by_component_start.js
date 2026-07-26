const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Get the first part of the BY component (state setup, effects)
console.log("=== BY component start ===");
console.log(content.substring(1963042, 1967000));
