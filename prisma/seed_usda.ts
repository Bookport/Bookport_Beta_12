import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

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

async function main() {
  console.log("Loading USDA SR Legacy data...");
  const filePath = path.join(process.cwd(), "usda_sr_legacy.json");
  const dataRaw = await fs.readFile(filePath, "utf-8");
  
  // The file might be an array or have an SRLegacyFoods wrapper
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
      process.exit(1);
    }
  } catch (err) {
    console.error("Failed to parse JSON:", err);
    process.exit(1);
  }

  console.log(`Found ${items.length} items. Processing...`);
  
  let createdCount = 0;
  let updatedCount = 0;
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
        iodine: getNut("Iodine"), // rare
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
  
  console.log(`Seed complete. Processed ${createdCount} items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
