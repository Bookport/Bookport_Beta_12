import { PrismaClient } from "@prisma/client";
import { INGREDIENT_TRANSLATIONS } from "./src/data/ingredientTranslations";
const prisma = new PrismaClient();

const skipWords = ["blend", "substitute", "imitation", "fabricated", "formulated", "lunchmeat", "canned", "commercial"];

async function main() {
  const translations = Array.from(new Set(Object.values(INGREDIENT_TRANSLATIONS)));
  let missing = 0;
  for (const t of translations) {
    const words = t.split(" ").filter(w => w.length > 0);
    const items = await prisma.foodItem.findMany({
      where: { AND: words.map(w => ({ name: { contains: w, mode: "insensitive" } })) },
      take: 100
    });
    
    const validItems = items.filter(item => {
      if (skipWords.some(w => item.name.includes(w))) return false;
      const nameLower = item.name.toLowerCase();
      for (const w of words) {
        const regex = new RegExp(`\\b${w}\\b`, 'i');
        if (!regex.test(nameLower)) return false;
      }
      return true;
    });

    if (validItems.length === 0) {
      console.log("NOT FOUND:", t);
      missing++;
    }
  }
  console.log(`Total missing: ${missing} / ${translations.length}`);
}
main().finally(() => prisma.$disconnect());
