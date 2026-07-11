const fs = require('fs');
let text = fs.readFileSync('src/components/StateNowScreen.tsx', 'utf8');

const regexes = [
  /\{\n  const todayBreakfastRecipe =/g,
  /\{\n  const todayLunchRecipe =/g,
  /\{\n  const todayDinnerRecipe =/g,
  /\{\n  const todayMustHave =/g,
  /\{\n  const todayRecipeOfDay =/g,
  /\{\n  const todayDrink =/g,
  /\{\n  const todayCompliment =/g
];

regexes.forEach(r => {
  text = text.replace(r, match => match.substring(3));
});

// Now we need to remove the closing braces. Since they are placed right after the if statement block, they look like:
//       fiber: macros.fib.toFixed(1)
//     });
//   }
// }
// Let's replace "}\n}" with "}" around these specific areas.

text = text.replace(/    \}\);\n  \}\n\}/g, "    });\n  }");
fs.writeFileSync('src/components/StateNowScreen.tsx', text);
