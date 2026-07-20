const fs = require('fs');
let fileContent = fs.readFileSync('src/data/ingredientTranslations.ts', 'utf8');

const updates = {
  "капуста квашеная": "sauerkraut",
  "квашеная капуста": "sauerkraut",
  "капуста": "cabbage raw",
  "яблоко": "apples raw",
  "яблоки": "apples raw",
  "кориандр": "coriander seed",
  "вода": "water"
};

for (const [ru, en] of Object.entries(updates)) {
  const regex = new RegExp(`"${ru}":\\s*"[^"]*"`, 'g');
  if (regex.test(fileContent)) {
    fileContent = fileContent.replace(regex, `"${ru}": "${en}"`);
  } else {
    fileContent = fileContent.replace(/};\s*$/, `  "${ru}": "${en}",\n};\n`);
  }
}

fs.writeFileSync('src/data/ingredientTranslations.ts', fileContent);
console.log('Translations updated.');
