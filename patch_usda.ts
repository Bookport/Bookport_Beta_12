import fs from 'fs';

const file = fs.readFileSync('server.ts', 'utf-8');

const startIdx = file.indexOf('async function fetchUsdaNutrition');
const endMarker = 'async function startServer() {';
const endIdx = file.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.log("Could not find boundaries");
    process.exit(1);
}

const replacement = `async function fetchUsdaNutrition(ingredients: { foodName: string; weightInGrams: number }[]): Promise<{
  calories: number; protein: number; fat: number; carbs: number; fiber: number;
  iron: number; zinc: number; magnesium: number; iodine: number; selenium: number;
  vitaminC: number; vitaminB9: number; lysine: number; methionine: number;
} | null> {
  try {
    const skipWords = ["blend", "substitute", "vegetarian", "imitation", "fabricated", "formulated", "frankfurter", "lunchmeat", "powder", "leaves", "flakes", "canned", "prepared", "commercial", "mix"];

    const results = await Promise.all(
      ingredients.map(async (ingr) => {
        try {
          const words = ingr.foodName.split(" ").filter(w => w.length > 0);
          if (words.length === 0) return null;

          const items = await prisma.foodItem.findMany({
            where: {
              AND: words.map(w => ({ name: { contains: w, mode: "insensitive" } }))
            },
            take: 100
          });

          const validItems = items.filter(item => {
            if (skipWords.some(w => item.name.includes(w))) return false;
            const nameLower = item.name.toLowerCase();
            for (const w of words) {
              const regex = new RegExp(\`\\\\b\${w}\\\\b\`, 'i');
              if (!regex.test(nameLower)) return false;
            }
            return true;
          });

          validItems.sort((a, b) => a.name.length - b.name.length);
          const food = validItems[0];

          if (!food) {
            console.warn(\`[USDA] No food found in local DB for query: \${ingr.foodName}\`);
            return null;
          }

          const ratio = ingr.weightInGrams / 100;
          console.log("[PIPELINE TRACE 3] Local DB Queried:", ingr.foodName, "→ Matched FDC ID:", food.fdcId, food.name, "Base cals (per 100g):", food.calories);

          return {
            calories: food.calories * ratio,
            protein: food.protein * ratio,
            fat: food.fat * ratio,
            carbs: food.carbs * ratio,
            fiber: food.fiber * ratio,
            iron: (food.iron || 0) * ratio,
            zinc: (food.zinc || 0) * ratio,
            magnesium: (food.magnesium || 0) * ratio,
            iodine: (food.iodine || 0) * ratio,
            selenium: (food.selenium || 0) * ratio,
            vitaminC: (food.vitaminC || 0) * ratio,
            vitaminB9: (food.vitaminB9 || 0) * ratio,
            lysine: (food.lysine || 0) * ratio,
            methionine: (food.methionine || 0) * ratio,
          };
        } catch (err: any) {
          console.warn(\`[USDA] Local DB Error for query: \${ingr.foodName}:\`, err?.message);
          return null;
        }
      })
    );

    const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
    if (valid.length === 0) return null;

    return {
      calories: Math.round(valid.reduce((s, r) => s + r.calories, 0)),
      protein: Math.round(valid.reduce((s, r) => s + r.protein, 0) * 10) / 10,
      fat: Math.round(valid.reduce((s, r) => s + r.fat, 0) * 10) / 10,
      carbs: Math.round(valid.reduce((s, r) => s + r.carbs, 0) * 10) / 10,
      fiber: Math.round(valid.reduce((s, r) => s + r.fiber, 0) * 10) / 10,
      iron: Math.round(valid.reduce((s, r) => s + r.iron, 0) * 10) / 10,
      zinc: Math.round(valid.reduce((s, r) => s + r.zinc, 0) * 10) / 10,
      magnesium: Math.round(valid.reduce((s, r) => s + r.magnesium, 0)),
      iodine: Math.round(valid.reduce((s, r) => s + r.iodine, 0) * 10) / 10,
      selenium: Math.round(valid.reduce((s, r) => s + r.selenium, 0) * 10) / 10,
      vitaminC: Math.round(valid.reduce((s, r) => s + r.vitaminC, 0) * 10) / 10,
      vitaminB9: Math.round(valid.reduce((s, r) => s + r.vitaminB9, 0)),
      lysine: Math.round(valid.reduce((s, r) => s + r.lysine, 0) * 10) / 10,
      methionine: Math.round(valid.reduce((s, r) => s + r.methionine, 0) * 10) / 10,
    };
  } catch (error) {
    console.warn("[USDA] fetchUsdaNutrition local DB error:", error);
    return null;
  }
}

`;

const newFile = file.substring(0, startIdx) + replacement + file.substring(endIdx);
fs.writeFileSync('server.ts', newFile);
console.log("Patched server.ts successfully");
