const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Find the component beginning - look for the function definition 
// that contains all the analytics state
// Search for patterns that start the component
const patterns = [
  'function', 'useState', 'useEffect', 'useMemo'
];

// Let me specifically look around 1986000-1988000 for the component
console.log("=== Component area 1986000-1988000 ===");
console.log(content.substring(1986000, 1988000));
