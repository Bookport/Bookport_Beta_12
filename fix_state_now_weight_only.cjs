const fs = require('fs');
const path = 'src/components/StateNowScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

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
fs.writeFileSync(path, content);
