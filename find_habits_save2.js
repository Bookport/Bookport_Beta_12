const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Search for how habits are saved - within the habits screen
// The xO component receives onSaveProgress prop - find how it's called
const xOidx = content.indexOf("function xO(");
const section = content.substring(xOidx, xOidx + 20000);

// Search for the save button in the habits UI
const savePattern = /сохранит|save|Сохранить/i;
let pos = -1;
let count = 0;
while ((pos = section.indexOf(savePattern, pos + 1)) !== -1 && count < 5) {
  const start = Math.max(0, pos - 60);
  const end = Math.min(section.length, pos + 120);
  console.log(`\n--- save button at ${pos} ---`);
  console.log(section.substring(start, end));
  count++;
}

// Search for where metrics/daily is called in fO component (my-day)
// This is where habitsDone is sent to backend
console.log("\n\n=== fO component habits flow ===");
const fOidx = content.indexOf("function fO(");
const fOSection = content.substring(fOidx, fOidx + 10000);

// search for rs calls that include habitsDone or daily
pos = -1;
count = 0;
while ((pos = fOSection.indexOf("rs(/api/metrics/daily", pos + 1)) !== -1 && count < 3) {
  const start = Math.max(0, pos - 40);
  const end = Math.min(fOSection.length, pos + 400);
  console.log(`\n--- rs(/api/metrics/daily at ${fOidx + pos} ---`);
  console.log(fOSection.substring(start, end));
  count++;
}
