import fs from 'fs';

const file = fs.readFileSync('server.ts', 'utf-8');

// We need to modify parseAndTranslateIngredients to include originalName
let newFile = file.replace(
  `Promise<{ foodName: string; weightInGrams: number }[]>`,
  `Promise<{ originalName: string; foodName: string; weightInGrams: number }[]>`
);

newFile = newFile.replace(
  `const result: { foodName: string; weightInGrams: number }[] = [];`,
  `const result: { originalName: string; foodName: string; weightInGrams: number }[] = [];`
);

newFile = newFile.replace(
  `result.push({ foodName: translation, weightInGrams: weight });`,
  `result.push({ originalName: name, foodName: translation, weightInGrams: weight });`
);

newFile = newFile.replace(
  `result.push({ foodName: name, weightInGrams: weight }); // placeholder`,
  `result.push({ originalName: name, foodName: name, weightInGrams: weight }); // placeholder`
);

newFile = newFile.replace(
  `result[idx] = { foodName: p.foodName, weightInGrams: p.weightInGrams || unknowns[j].weight };`,
  `result[idx] = { originalName: unknowns[j].name, foodName: p.foodName, weightInGrams: p.weightInGrams || unknowns[j].weight };`
);

// Now update fetchUsdaNutrition signature
newFile = newFile.replace(
  `async function fetchUsdaNutrition(ingredients: { foodName: string; weightInGrams: number }[]): Promise<{`,
  `async function fetchUsdaNutrition(ingredients: { originalName?: string; foodName: string; weightInGrams: number }[]): Promise<{`
);

// Add the DB update logic right after food is found
const dbUpdateLogic = `
          const ratio = ingr.weightInGrams / 100;
          console.log("[PIPELINE TRACE 3] Local DB Queried:", ingr.foodName, "→ Matched FDC ID:", food.fdcId, food.name, "Base cals (per 100g):", food.calories);

          // Self-learning: save russian name
          if (ingr.originalName) {
            const rName = ingr.originalName.toLowerCase().trim();
            if (rName && (!food.russianName || !food.russianName.includes(rName))) {
              try {
                const newRussian = food.russianName ? food.russianName + ',' + rName : rName;
                await prisma.foodItem.update({
                  where: { fdcId: food.fdcId },
                  data: { russianName: newRussian }
                });
                translationCache.set(rName, ingr.foodName);
              } catch (e) { console.error("Failed to update russianName", e); }
            }
          }
`;

newFile = newFile.replace(
  `          const ratio = ingr.weightInGrams / 100;
          console.log("[PIPELINE TRACE 3] Local DB Queried:", ingr.foodName, "→ Matched FDC ID:", food.fdcId, food.name, "Base cals (per 100g):", food.calories);`,
  dbUpdateLogic
);

fs.writeFileSync('server.ts', newFile);
console.log("Patched server.ts successfully");
