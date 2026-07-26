const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Search for where "state-now" screen is rendered
// Look at the main screen switch (around 930000-950000)
let idx = content.indexOf('"state-now"');
while (idx !== -1 && idx > 925000 && idx < 1000000) {
  const start = Math.max(0, idx - 100);
  const end = Math.min(content.length, idx + 300);
  console.log(`\n=== state-now at ${idx} ===`);
  console.log(content.substring(start, end));
  idx = content.indexOf('"state-now"', idx + 1);
}

// Search for the analytics component render
// It should be called when screen === "state-now"
console.log("\n\n=== Looking for screen switch conditional ===");
// search for "state-now" in the main screen component
let idx2 = content.indexOf("case\"state-now\"");
if (idx2 === -1) idx2 = content.indexOf(`"state-now"&&`);
if (idx2 === -1) idx2 = content.indexOf('screen==="state-now"');
if (idx2 === -1) idx2 = content.indexOf('"state-now"');
console.log(`idx2=${idx2}`);
