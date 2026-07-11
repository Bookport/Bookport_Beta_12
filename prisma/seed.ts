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
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
