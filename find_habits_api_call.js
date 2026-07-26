const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Search for where habitsDone is bundled into an API request
// Look for the pattern: habitsDone + rs( anywhere
let habitsDoneIdx = -1;
let count = 0;

// Search within 300 chars of habitsDone for rs( calls
while ((habitsDoneIdx = content.indexOf("habitsDone", habitsDoneIdx + 1)) !== -1 && count < 20) {
  const start = Math.max(0, habitsDoneIdx - 10);
  const end = Math.min(content.length, habitsDoneIdx + 400);
  const context = content.substring(start, end);
  
  // Check if nearby there's an rs( call
  const rsIdx = context.indexOf("rs(");
  if (rsIdx !== -1) {
    console.log(`\n=== habitsDone near rs() at ${habitsDoneIdx} ===`);
    console.log(context);
    count++;
  }
}
