import { prisma } from "../src/prisma";
import { classifyIngredient } from "../src/utils/wfpbRules";

async function main() {
  const items = await prisma.foodItem.findMany();
  let updated = 0;
  for (const item of items) {
    const c = classifyIngredient(item.nameRu);
    const correctStatus = c.isForbidden ? "forbidden" : "green";
    if (item.wfpbStatus !== correctStatus) {
      await prisma.foodItem.update({
        where: { id: item.id },
        data: { wfpbStatus: correctStatus },
      });
      updated++;
    }
  }
  console.log(`Checked ${items.length} items, fixed ${updated} wfpbStatus values.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
