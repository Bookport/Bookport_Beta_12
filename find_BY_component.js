const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the BY component function definition
let idx = content.indexOf("BY({");
if (idx === -1) idx = content.indexOf("BY(");
if (idx === -1) idx = content.indexOf("function BY");
if (idx === -1) idx = content.indexOf(",BY=");

console.log("=== BY component ===");
if (idx !== -1) {
  console.log(`Found BY at ${idx}`);
  console.log(content.substring(Math.max(0, idx - 50), Math.min(content.length, idx + 500)));
} else {
  // Search for BY as a component
  const patterns = [/}\(BY\)/, /,BY=/, /BY=/];
  for (const p of patterns) {
    const m = p.exec(content);
    if (m) {
      console.log(`Pattern ${p} at ${m.index}: ${content.substring(m.index, m.index + 100)}`);
    }
  }
}

// Also search for the component in the 1960000-2000000 range
for (let searchIdx = 1960000; searchIdx < 2000000; searchIdx += 100) {
  const chunk = content.substring(searchIdx, searchIdx + 100);
  if (chunk.includes("BY") && (chunk.includes("{") || chunk.includes("="))) {
    const localIdx = chunk.indexOf("BY");
    console.log(`\nBY at ~${searchIdx + localIdx}: ${chunk.substring(Math.max(0, localIdx - 10), localIdx + 50)}`);
  }
}
