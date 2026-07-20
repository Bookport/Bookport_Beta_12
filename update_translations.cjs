const fs = require('fs');

let fileContent = fs.readFileSync('src/data/ingredientTranslations.ts', 'utf8');

const updates = {
  "овсянка": "oats raw",
  "изюм": "raisins",
  "корица": "cinnamon ground",
  "капуста": "cabbage raw",
  "морковь": "carrots raw",
  "яблоко": "apples raw",
  "картофель": "potatoes raw",
  "огурец": "cucumber raw",
  "помидор": "tomatoes raw",
  "лук": "onions raw",
  "чеснок": "garlic raw",
  "свёкла": "beets raw",
  "перец": "peppers raw"
};

let newContent = fileContent;

for (const [ru, en] of Object.entries(updates)) {
  const regex = new RegExp(`"${ru}":\\s*"[^"]*"`, 'g');
  if (regex.test(newContent)) {
    newContent = newContent.replace(regex, `"${ru}": "${en}"`);
  } else {
    // If not found, add it to the end of the object before the closing brace
    newContent = newContent.replace(/};\s*$/, `  "${ru}": "${en}",\n};\n`);
  }
}

fs.writeFileSync('src/data/ingredientTranslations.ts', newContent);
console.log('Translations updated.');
