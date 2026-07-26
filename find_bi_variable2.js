const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Search for bi in BY component range
let pos = -1;
let count = 0;
while ((pos = content.indexOf(",bi", pos + 1)) !== -1 && count < 10) {
  if (pos > 1963000 && pos < 1980000) {
    console.log(`--- ,bi at ${pos} ---`);
    console.log(content.substring(Math.max(0, pos - 30), Math.min(content.length, pos + 80)));
    count++;
  }
}
