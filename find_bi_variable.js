const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Search for bi in the BY component (1963000-1996000)
// bi is likely defined as a boolean for evening mode
let idx = content.indexOf("bi=");
if (idx === -1) idx = content.indexOf(",bi=");
if (idx === -1) idx = content.indexOf(";bi=");

if (idx !== -1 && idx > 1963000 && idx < 1996000) {
  console.log("=== bi definition ===");
  console.log(content.substring(Math.max(0, idx - 30), Math.min(content.length, idx + 200)));
} else {
  // Search more broadly
  const section = content.substring(1963000, 1996000);
  const biMatches = section.match(/[^$\w][bB]i\b[^$\w]/g);
  console.log("bi occurrences:", biMatches ? biMessages.slice(0, 10) : "none");
  
  // Actually, search for specific bi patterns
  let pos = -1;
  let count = 0;
  while ((pos = content.indexOf(",bi", pos + 1)) !== -1 && count < 10) {
    if (pos > 1963000 && pos < 1996000) {
      console.log(`\n--- ,bi at ${pos} ---`);
      console.log(content.substring(Math.max(0, pos - 20), Math.min(content.length, pos + 60)));
      count++;
    }
  }
}
