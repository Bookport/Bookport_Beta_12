import { PrismaClient } from "@prisma/client";
import { ACHIEVEMENTS } from "./src/modules/achievements/config/achievementContent";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Achievements...");
  for (const ach of ACHIEVEMENTS) {
    // Default availableFromDay to 1
    let day = 1;
    // Set specific days as requested
    if (ach.id === "ach-083") day = 7;
    
    await prisma.achievement.upsert({
      where: { id: ach.id },
      update: {
        name: ach.name,
        category: ach.category,
        type: ach.type,
        rarity: ach.rarity,
        xp: ach.xp,
        descriptionMale: ach.descriptionMale,
        descriptionFemale: ach.descriptionFemale,
        image: ach.image,
        isSecret: ach.isSecret,
        availableFromDay: day,
      },
      create: {
        id: ach.id,
        name: ach.name,
        category: ach.category,
        type: ach.type,
        rarity: ach.rarity,
        xp: ach.xp,
        descriptionMale: ach.descriptionMale,
        descriptionFemale: ach.descriptionFemale,
        image: ach.image,
        isSecret: ach.isSecret,
        availableFromDay: day,
      }
    });
  }
  console.log("Achievements seeded.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
