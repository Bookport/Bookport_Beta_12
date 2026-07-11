const fs = require('fs');
const path = 'src/components/StateNowScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// The closing sequence right now is:
//         fiber: macros.fib.toFixed(1)
//     });
//
// We need it to be:
//         fiber: macros.fib.toFixed(1)
//       });
//     }

content = content.replace(/        fiber: macros\.fib\.toFixed\(1\)\n    \}\);/g, "        fiber: macros.fib.toFixed(1)\n      });\n    }");

fs.writeFileSync(path, content);
