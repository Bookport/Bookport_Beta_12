import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const skipWords = ["blend", "substitute", "imitation", "fabricated", "formulated", "lunchmeat", "canned", "commercial"];

async function searchFood(query: string) {
  const words = query.split(" ").filter(w => w.length > 0);
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
  return validItems[0];
}

async function main() {
  const queries = ["sugar", "raisin", "oats", "chicken breast raw", "quinoa uncooked", "cheese", "cinnamon ground"];
  for (const q of queries) {
    const item = await searchFood(q);
    console.log(q, "->", item?.name);
  }
}
main().finally(() => prisma.$disconnect());
