const fs = require('fs');
const path = 'src/components/StateNowScreen.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/      \}\);\n    \}\n  \}/g, "    });\n  }");
content = content.replace(/\n  \}\n\n  \/\/ Dinner/g, "\n\n  // Dinner");
content = content.replace(/\n  \}\n\n  \/\/ Must/g, "\n\n  // Must");
content = content.replace(/\n  \}\n\n  \/\/ Recipe/g, "\n\n  // Recipe");
content = content.replace(/\n  \}\n\n  \/\/ Drinks/g, "\n\n  // Drinks");
content = content.replace(/\n  \}\n\n  \/\/ Compliments/g, "\n\n  // Compliments");
content = content.replace(/\n  \}\n\n  const cookedBookIds/g, "\n\n  const cookedBookIds");

fs.writeFileSync(path, content);
