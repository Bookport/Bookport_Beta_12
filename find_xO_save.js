const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the xO component's save function
const xOidx = content.indexOf("function xO(");
console.log("=== xO component full save logic ===");
// Find the section after xO component where it saves to /api/metrics/daily or similar
// Search from xOidx to xOidx + 15000
const section = content.substring(xOidx, xOidx + 15000);

// Search for rs( (the API call wrapper) within xO
let pos = 0;
const calls = [];
while ((pos = section.indexOf("rs(", pos + 1)) !== -1) {
  const start = Math.max(0, pos - 80);
  const end = Math.min(section.length, pos + 200);
  const ctx = section.substring(start, end);
  if (ctx.includes("metrics") || ctx.includes("habit") || ctx.includes("daily") || ctx.includes("save")) {
    calls.push({ pos, ctx });
  }
}

console.log(`Found ${calls.length} relevant rs() calls:`);
calls.forEach((c, i) => console.log(`\n#${i}:\n${c.ctx}`));

// If no API calls, search for where habits are saved
if (calls.length === 0) {
  // Look for localStorage saves
  pos = 0;
  const lsCalls = [];
  while ((pos = section.indexOf("localStorage", pos + 1)) !== -1) {
    const start = Math.max(0, pos - 60);
    const end = Math.min(section.length, pos + 120);
    lsCalls.push(section.substring(start, end));
  }
  console.log(`localStorage references: ${lsCalls.length}`);
  lsCalls.slice(0, 5).forEach((c, i) => console.log(`\n#${i}: ${c}`));
}
