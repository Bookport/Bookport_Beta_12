const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// The DS function generates analysis text. Let me search for it differently.
// Since the analysis is generated per tab, look for the text switches
// in the parent component around the variable definitions.

// Look near where UV is called (around index 1996200-1996700)
console.log("=== Area around UV component call ===");
console.log(content.substring(1996000, 1996800));
