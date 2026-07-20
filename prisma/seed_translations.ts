import { PrismaClient } from "@prisma/client";
import { INGREDIENT_TRANSLATIONS } from "../src/data/ingredientTranslations";
const prisma = new PrismaClient();

const skipWords = ["blend", "substitute", "imitation", "fabricated", "formulated", "lunchmeat", "canned", "commercial"];

async function main() {
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
      if (!food.russianName || !food.russianName.includes(rName)) {
        const newRussian = food.russianName ? food.russianName + ',' + rName : rName;
        await prisma.foodItem.update({
          where: { id: food.id },
          data: { russianName: newRussian }
        });
        count++;
      }
    }
  }
  console.log(`Seeded ${count} Russian translations into the database.`);
}

main().finally(() => prisma.$disconnect());
