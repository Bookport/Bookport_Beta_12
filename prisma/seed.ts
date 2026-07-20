import { PrismaClient } from "@prisma/client";
import { complimentsBackData } from "../src/data/compliments_back";
import { breakfastBackData } from "../src/data/breakfast_back";
import { lunchBackData } from "../src/data/lunch_back";
import { dinnerBackData } from "../src/data/dinner_back";
import { recipeDayBackData } from "../src/data/recipe_day_back";
import { mustHaveBackData } from "../src/data/must_have_back";

const prisma = new PrismaClient();

interface BackEntry {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string;
  kbju: string[];
}

function parseId(fullId: string): { type: string; id: number } {
  const parts = fullId.split("_");
  const type = parts.slice(0, -1).join("_");
  const id = parseInt(parts[parts.length - 1], 10);
  return { type, id };
}

function mapWeek(type: string, id: number): string | null {
  if (type === "compliment" || type === "must_have") {
    if (id <= 9) return "Неделя 1";
    if (id <= 16) return "Неделя 2 (соусы)";
    return "Неделя 3 (смеси специй)";
  }
  if (type === "breakfast" || type === "lunch" || type === "dinner") {
    if (id <= 9) return "Неделя 1";
    if (id <= 17) return "Неделя 2";
    if (id <= 24) return "Неделя 3";
    return "Неделя 4";
  }
  return null;
}

async function seedBackData(type: string, data: BackEntry[]) {
  let count = 0;
  for (const entry of data) {
    const { type: t, id } = parseId(entry.id);
    if (t !== type) continue;
    await prisma.bookRecipe.upsert({
      where: { type_id: { type: t, id } },
      update: {
        technicalName: entry.title,
        ingredients: JSON.stringify(entry.ingredients),
        instructions: entry.instructions,
        kbju: JSON.stringify(entry.kbju),
        week: mapWeek(t, id),
      },
      create: {
        type: t,
        id,
        technicalName: entry.title,
        ingredients: JSON.stringify(entry.ingredients),
        instructions: entry.instructions,
        kbju: JSON.stringify(entry.kbju),
        week: mapWeek(t, id),
      },
    });
    count++;
  }
  console.log(`  Seeded ${count} ${type} recipes`);
}

async function main() {
  console.log("Seeding database...");
  console.log("");

  console.log("Loading recipes:");
  await seedBackData("compliment", complimentsBackData as unknown as BackEntry[]);
  await seedBackData("breakfast", breakfastBackData as unknown as BackEntry[]);
  await seedBackData("lunch", lunchBackData as unknown as BackEntry[]);
  await seedBackData("dinner", dinnerBackData as unknown as BackEntry[]);
  await seedBackData("recipe_day", recipeDayBackData as unknown as BackEntry[]);
  await seedBackData("must_have", mustHaveBackData as unknown as BackEntry[]);

  console.log("");
  console.log("BookRecipe seeding complete.");
  await seedUSDA();
  await seedTranslations();
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import fs from "fs/promises";
import path from "path";

const FORBIDDEN_WORDS = ["beef", "pork", "chicken", "turkey", "lamb", "meat", "fish", "salmon", "tuna", "shrimp", "egg", "cheese", "milk", "butter", "cream", "oil", "salt", "sugar", "syrup", "fried", "sausage", "bacon", "candies", "cake", "cookie"];
const ALLOWED_WORDS = ["raw", "fresh", "uncooked", "bean", "lentil", "apple", "broccoli", "quinoa", "rice", "oat", "carrot", "spinach", "pea", "seed", "nut"];

function determineWfpbStatus(name: string): string {
  const lower = name.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (lower.includes(word)) return "forbidden";
  }
  for (const word of ALLOWED_WORDS) {
    if (lower.includes(word)) return "allowed";
  }
  return "grey";
}

async function seedUSDA() {
  const existing = await prisma.foodItem.count();
  if (existing >= 7000) {
    console.log(`FoodItem table already seeded (${existing} items). Skipping USDA seed.`);
    return;
  }

  console.log("Loading USDA SR Legacy data...");
  const filePath = path.join(process.cwd(), "usda_sr_legacy.json");
  let dataRaw: string;
  try {
    dataRaw = await fs.readFile(filePath, "utf-8");
  } catch (err) {
    console.log("usda_sr_legacy.json not found. Skipping USDA seed.");
    return;
  }
  
  let items: any[];
  try {
    const parsed = JSON.parse(dataRaw);
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed.SRLegacyFoods) {
      items = parsed.SRLegacyFoods;
    } else if (parsed.FoundationFoods) {
      items = parsed.FoundationFoods;
    } else {
      console.error("Unknown JSON structure");
      return;
    }
  } catch (err) {
    console.error("Failed to parse JSON:", err);
    return;
  }

  console.log(`Found ${items.length} USDA items. Processing...`);
  let createdCount = 0;
  const BATCH_SIZE = 1000;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const dbItems = batch.map((item: any) => {
      const nutrients = item.foodNutrients || [];
      const getNut = (nameSubstring: string) => {
        const n = nutrients.find((nut: any) => 
          nut.nutrient && nut.nutrient.name && nut.nutrient.name.toLowerCase().includes(nameSubstring.toLowerCase())
        );
        return n ? (n.amount || 0) : 0;
      };
      const getEnergy = () => {
        const n = nutrients.find((nut: any) => 
          nut.nutrient && nut.nutrient.name && nut.nutrient.name.toLowerCase().includes("energy")
        );
        if (!n) return 0;
        const unit = (n.nutrient.unitName || "").toLowerCase();
        const val = n.amount || 0;
        return unit === "kj" ? Math.round(val / 4.184) : val;
      };

      return {
        fdcId: item.fdcId,
        name: (item.description || "Unknown Food").toLowerCase(),
        calories: getEnergy(),
        protein: getNut("Protein"),
        fat: getNut("Total lipid (fat)") || getNut("Total lipid"),
        carbs: getNut("Carbohydrate, by difference") || getNut("Carbohydrate"),
        fiber: getNut("Fiber, total dietary") || getNut("Fiber"),
        iron: getNut("Iron, Fe"),
        zinc: getNut("Zinc, Zn"),
        magnesium: getNut("Magnesium, Mg"),
        iodine: getNut("Iodine"),
        selenium: getNut("Selenium, Se"),
        vitaminC: getNut("Vitamin C, total ascorbic acid"),
        vitaminB9: getNut("Folate, total"),
        lysine: getNut("Lysine"),
        methionine: getNut("Methionine"),
        wfpbStatus: determineWfpbStatus(item.description || "")
      };
    });

    for (const data of dbItems) {
      try {
        await prisma.foodItem.upsert({
          where: { fdcId: data.fdcId },
          update: data,
          create: data
        });
        createdCount++;
      } catch (err) {
        console.warn(`Failed to insert fdcId ${data.fdcId}`, err);
      }
    }
    console.log(`Processed ${Math.min(i + BATCH_SIZE, items.length)} / ${items.length}`);
  }
  console.log(`USDA Seed complete. Processed ${createdCount} items.`);
}

import { INGREDIENT_TRANSLATIONS } from "../src/data/ingredientTranslations";
const skipWords = ["blend", "substitute", "imitation", "fabricated", "formulated", "lunchmeat", "canned", "commercial"];

async function seedTranslations() {
  console.log("Seeding Russian translations...");
  let count = 0;
  for (const [rus, eng] of Object.entries(INGREDIENT_TRANSLATIONS)) {
    const words = eng.split(" ").filter(w => w.length > 0);
    const items = await prisma.foodItem.findMany({
      where: { AND: words.map(w => ({ name: { contains: w, mode: "insensitive" } })) },
      take: 100
    });
    
    const validItems = items.filter(item => {
      if (skipWords.some(w => item.name.includes(w))) return false;
      const nameLower = item.name.toLowerCase();
      for (const w of words) {
        const regex = new RegExp(`\\b${w}(s|es|ed)?\\b`, 'i');
        if (!regex.test(nameLower)) {
          if (w.endsWith('s')) {
            const singular = w.slice(0, -1);
            const regexSingular = new RegExp(`\\b${singular}(s|es|ed)?\\b`, 'i');
            if (!regexSingular.test(nameLower)) return false;
          } else {
            return false;
          }
        }
      }
      return true;
    });

    validItems.sort((a, b) => a.name.length - b.name.length);
    const food = validItems[0];
    
    if (food) {
      const rName = rus.toLowerCase().trim();
      if (!food.russianName || !food.russianName.split(',').includes(rName)) {
        const newRussian = food.russianName ? food.russianName + ',' + rName : rName;
        await prisma.foodItem.update({
          where: { id: food.id },
          data: { russianName: newRussian }
        });
        count++;
      }
    }
  }
  console.log(`Seeded ${count} new Russian translations.`);
}
