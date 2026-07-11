const fs = require('fs');
const path = '/home/sam/code/coder/Bookport_12.0_Beta/src/components/StateNowScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add weight to props
const targetProps = `  setRatingWellbeing: propsSetRatingWellbeing,
  setRatingEnergy: propsSetRatingEnergy,
  setRatingLightness: propsSetRatingLightness,`;
const replacementProps = `  weight = 70,
  setRatingWellbeing: propsSetRatingWellbeing,
  setRatingEnergy: propsSetRatingEnergy,
  setRatingLightness: propsSetRatingLightness,`;

if (!content.includes('weight = 70,')) {
    content = content.replace(targetProps, replacementProps);
}

// 2. Wrap checks in block scopes
const blocksToWrap = [
  { match: /const todayBreakfastRecipe = BREAKFAST_RECIPES[^]+?\}\n/g },
  { match: /const todayLunchRecipe = LUNCH_RECIPES[^]+?\}\n/g },
  { match: /const todayDinnerRecipe = DINNER_RECIPES[^]+?\}\n/g },
  { match: /const todayMustHave = MUST_HAVE_RECIPES[^]+?\}\n/g },
  { match: /const todayRecipeOfDay = RECIPE_OF_DAY_RECIPES[^]+?\}\n/g },
  { match: /const todayDrink = DRINKS_RECIPES[^]+?\}\n/g },
  { match: /const todayCompliment = COMPLIMENTS_RECIPES[^]+?\}\n/g }
];

blocksToWrap.forEach(block => {
  content = content.replace(block.match, (matched) => {
    if (matched.trim().startsWith('{')) return matched; // already wrapped
    return '{\n  ' + matched.split('\n').join('\n  ') + '}\n';
  });
});

fs.writeFileSync(path, content);
console.log("StateNowScreen patched successfully.");
