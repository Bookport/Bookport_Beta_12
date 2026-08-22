import { prisma } from "../src/prisma";
import fs from "fs";
import csv from "csv-parser";

async function main() {
  console.log("Starting Step 1: Updating FDC IDs, nameEn, and wfpbStatus...");

  const results: any[] = [];
  
  await new Promise((resolve, reject) => {
    fs.createReadStream("BASE_FIXED_IDs.csv")
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`Loaded ${results.length} records from CSV.`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const row of results) {
    const nameRu = row.nameRu?.trim();
    const fdcIdStr = row.fdcId?.trim();
    const nameEn = row.nameEn?.trim();
    const wfpbStatus = row.wfpbStatus?.trim();

    if (!nameRu || !fdcIdStr) continue;

    const fdcId = parseInt(fdcIdStr, 10);
    if (isNaN(fdcId)) {
      console.log(`Invalid FDC ID for ${nameRu}: ${fdcIdStr}`);
      continue;
    }

    try {
      const existing = await prisma.foodItem.findUnique({
        where: { nameRu: nameRu },
      });

      if (existing) {
        await prisma.foodItem.update({
          where: { nameRu: nameRu },
          data: {
            fdcId: fdcId,
            nameEn: nameEn || existing.nameEn,
            wfpbStatus: wfpbStatus || existing.wfpbStatus,
          },
        });
        updatedCount++;
      } else {
        console.log(`FoodItem not found in DB: ${nameRu}`);
        notFoundCount++;
      }
    } catch (err) {
      console.error(`Error updating ${nameRu}:`, err);
    }
  }

  console.log(`\nUpdate Complete!`);
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Not found in DB: ${notFoundCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
