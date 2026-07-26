const fs = require('fs');
const content = fs.readFileSync('/app/dist/assets/index-DetcCmci.js', 'utf8');

// Look for the integral score ring and the 7 factors
// Search for "integralScore", "mn", "integralIndex", percentages
const searches = [
  'integralScore', 'integralIndex', 'integral', 
  'mn=', 'let mn', 'const mn', 'var mn',
  'sleepPct', 'waterPct', 'mealsPct', 'habitsPct',
  'energyPct', 'wellbeingPct', 'digestionPct',
  'ratingWellbeing', 'ratingEnergy', 'ratingLightness',
  '0.2', '0.15', '0.1', '0.05',
  'hydrationState',
  'getAnnaAnalysis', 'Ds('
];

for (const s of searches) {
  let idx = -1;
  let count = 0;
  while ((idx = content.indexOf(s, idx + 1)) !== -1 && count < 5) {
    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, idx + 150);
    console.log(`\n=== '${s}' at ${idx} ===`);
    console.log(content.substring(start, end));
    count++;
  }
}
