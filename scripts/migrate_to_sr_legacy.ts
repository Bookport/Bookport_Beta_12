import { prisma } from "../src/prisma";
import * as dotenv from "dotenv";

dotenv.config();

const USDA_API_KEY = process.env.USDA_API_KEY || "ywYviAkfdnK8u2Sn19fMG7Kvmje8y2Bd66Hi2hlN";
const BATCH_SIZE = 50;

function parseUSDA(food: any) {
  const foodNutrients = food.foodNutrients || [];
  
  const get = (identifiers: (number | string)[]): number => {
    for (const id of identifiers) {
      const found = foodNutrients.find((n: any) =>
        n.nutrient?.id === id || n.nutrient?.number === id || n.nutrientId === id
      );
      const val = found?.amount ?? found?.value;
      if (val != null) return Number(val) || 0;
    }
    return 0;
  };
  
  const sum = (identifiers: (number | string)[]): number => {
    let total = 0;
    for (const id of identifiers) {
      const found = foodNutrients.find((n: any) =>
        n.nutrient?.id === id || n.nutrient?.number === id || n.nutrientId === id
      );
      const val = found?.amount ?? found?.value;
      if (val != null) total += Number(val) || 0;
    }
    return total;
  };

  return {
    calories:            get([2047, 1008, "208"]),
    protein:             get([1003, "203"]),
    fat:                 get([1004, "204"]),
    carbohydrates:       get([1005, "205"]),
    water:               get([1051, "255"]),
    fiber:               get([1079, "291"]),
    sugarTotal:          get([1063, 2000, "269"]),
    sucrose:             get([1010, "210"]),
    glucose:             get([1011, "211"]),
    fructose:            get([1012, "212"]),
    lactose:             get([1013, "213"]),
    maltose:             get([1014, "214"]),
    saturatedFat:        get([1258, "606"]),
    monounsaturatedFat:  get([1292, "645"]),
    polyunsaturatedFat:  get([1293, "646"]),
    transFat:            get([1257, "605"]),
    cholesterol:         get([1253, "601"]),
    omega3:              sum([1271, 1278, 1272, 1280, "851", "629", "631", "621"]),
    omega6:              sum([1269, 1270, "618", "620"]),
    omega9:              get([1259, "614"]),
    calcium:             get([1087, "301"]),
    iron:                get([1089, "303"]),
    magnesium:           get([1090, "304"]),
    phosphorus:          get([1091, "305"]),
    potassium:           get([1092, "306"]),
    sodium:              get([1093, "307"]),
    zinc:                get([1095, "309"]),
    copper:              get([1098, "312"]),
    manganese:           get([1101, "315"]),
    iodine:              get([1100, "317"]), 
    selenium:            get([1103, "317"]), 
    vitaminC:            get([1162, "401"]),
    thiamin:             get([1165, "404"]),
    riboflavin:          get([1166, "405"]),
    niacin:              get([1167, "406"]),
    pantothenicAcid:     get([1170, "410"]),
    vitaminB6:           get([1175, "415"]),
    biotin:              get([1176, "419"]),
    folate:              get([1177, "417"]),
    vitaminB12:          get([1178, "418"]),
    vitaminA:            get([1106, 1104, "320", "318"]),
    retinol:             get([1105, "319"]),
    betaCarotene:        get([1107, "321"]),
    vitaminD:            get([1114, "328"]),
    vitaminD2:           get([1111, "325"]),
    vitaminD3:           get([1112, "326"]),
    vitaminE:            get([1109, "323"]),
    vitaminK:            get([1185, "430"]),
    lysine:              get([1214, "511"]),
    methionine:          get([1215, "506"]),
    tryptophan:          get([1210, "501"]),
    threonine:           get([1211, "502"]),
    isoleucine:          get([1212, "503"]),
    leucine:             get([1213, "504"]),
    cystine:             get([1216, "507"]),
    phenylalanine:       get([1217, "508"]),
    tyrosine:            get([1218, "509"]),
    valine:              get([1219, "510"]),
    arginine:            get([1220, "516"]),
    histidine:           get([1221, "512"]),
    alanine:             get([1222, "513"]),
    asparticAcid:        get([1223, "514"]),
    glutamicAcid:        get([1224, "515"]),
    glycine:             get([1225, "516"]), 
    proline:             get([1226, "517"]),
    serine:              get([1227, "518"]),
  };
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log("Starting Migration to SR Legacy / Foundation...");

  const items = await prisma.foodItem.findMany();
  console.log(`Found ${items.length} items in the database.`);

  let migratedCount = 0;

  // Step 1: Search for SR Legacy / Foundation FDC IDs
  console.log("Phase 1: Searching for better FDC IDs...");
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i % 20 === 0) {
      console.log(`Searching item ${i + 1}/${items.length}...`);
    }

    try {
      const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: item.nameEn,
          dataType: ["SR Legacy", "Foundation"],
          pageSize: 1
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.foods && data.foods.length > 0) {
          const newFdcId = data.foods[0].fdcId;
          if (item.fdcId !== newFdcId) {
            item.fdcId = newFdcId;
            migratedCount++;
          }
        }
      } else {
        console.log(`Failed search for ${item.nameEn}: ${response.status}`);
      }
    } catch (e) {
      console.error(`Search error for ${item.nameEn}:`, e);
    }

    // 300ms pause to avoid ban
    await delay(300);
  }

  console.log(`Phase 1 Complete. Successfully matched ${migratedCount} items to SR Legacy/Foundation.`);

  console.log("Waiting 10 seconds before Phase 2 to avoid rate limits...");
  await delay(10000);

  // Step 2: Batch enrich
  console.log("Phase 2: Batch Fetching Full Profiles...");
  const validItems = items.filter(i => i.fdcId);
  const batches: any[][] = [];
  for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
    batches.push(validItems.slice(i, i + BATCH_SIZE));
  }

  const enrichedMap = new Map<number, any>();

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const fdcIds = batch.map(b => b.fdcId);

    console.log(`Fetching batch ${i + 1}/${batches.length} (${fdcIds.length} items)...`);
    
    let success = false;
    let attempts = 0;
    while (!success && attempts < 3) {
      attempts++;
      try {
        const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods?api_key=${USDA_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fdcIds }),
          signal: AbortSignal.timeout(30000)
        });

        if (response.ok) {
          const usdaFoods = await response.json();
          for (const food of usdaFoods) {
            enrichedMap.set(food.fdcId, parseUSDA(food));
          }
          success = true;
        } else {
          console.error(`Error batch ${i + 1} (Attempt ${attempts}): ${response.status}`);
          await delay(2000);
        }
      } catch (e) {
        console.error(`Exception batch ${i + 1}:`, e);
        await delay(2000);
      }
    }
    
    if (i < batches.length - 1) await delay(4000);
  }

  // Step 3: Update DB
  console.log("Phase 3: Updating Database...");
  let updatedCount = 0;
  for (const item of validItems) {
    const enriched = enrichedMap.get(item.fdcId!);
    if (enriched) {
      await prisma.foodItem.update({
        where: { id: item.id },
        data: {
          fdcId: item.fdcId,
          ...enriched
        }
      });
      updatedCount++;
    }
  }

  console.log("===================================");
  console.log(`MIGRATION COMPLETE!`);
  console.log(`Items matched to SR Legacy/Foundation: ${migratedCount}`);
  console.log(`Items successfully enriched in DB: ${updatedCount}`);
  console.log("===================================");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
