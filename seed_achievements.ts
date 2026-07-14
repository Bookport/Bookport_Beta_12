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
    if (["ach-064", "ach-033", "ach-034", "ach-037", "ach-010", "ach-018", "ach-019", "ach-068", "ach-069", "ach-025"].includes(ach.id)) day = 8;
    if (["ach-015", "ach-016"].includes(ach.id)) day = 14;
    if (["ach-043", "ach-047", "ach-045", "ach-046", "ach-044", "ach-042", "ach-048", "ach-049", "ach-051", "ach-050", "ach-052", "ach-020", "ach-021", "ach-031"].includes(ach.id)) day = 15;
    if (["ach-054", "ach-055", "ach-056", "ach-058", "ach-060", "ach-063", "ach-032", "ach-073", "ach-071", "ach-074", "ach-072"].includes(ach.id)) day = 22;
    if (["ach-057", "ach-053", "ach-059"].includes(ach.id)) day = 28;
    if (["ach-075", "ach-076", "ach-077"].includes(ach.id)) day = 1;

    
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
