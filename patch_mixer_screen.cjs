const fs = require('fs');
let content = fs.readFileSync('src/modules/mixer/screens/MixerScreen.tsx', 'utf8');

content = content.replace(
  'mixer.triggerSpin(seconds, method)',
  'mixer.triggerSpin(seconds, method, charge.hasAutoReleased)'
);

fs.writeFileSync('src/modules/mixer/screens/MixerScreen.tsx', content, 'utf8');
console.log("Patched MixerScreen.");
