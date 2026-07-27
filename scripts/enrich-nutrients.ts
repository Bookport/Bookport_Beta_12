import { prisma } from "../src/prisma";

const USDA_FOOD_URL = "https://api.nal.usda.gov/fdc/v1/food";

function usdaApiKey(): string {
  return process.env.USDA_API_KEY || "ywYviAkfdnK8u2Sn19fMG7Kvmje8y2Bd66Hi2hlN";
}

function parseUSDA(food: any) {
  const foodNutrients = food.foodNutrients || [];
  const get = (ids: number[]): number => {
    for (const id of ids) {
      const found = foodNutrients.find((n: any) =>
        n.nutrient?.id === id || n.nutrientId === id
      );
      const val = found?.amount ?? found?.value;
      if (val != null) return Number(val) || 0;
    }
    return 0;
  };
  const sum = (ids: number[]): number => {
    let total = 0;
    for (const id of ids) {
      const found = foodNutrients.find((n: any) =>
        n.nutrient?.id === id || n.nutrientId === id
      );
      const val = found?.amount ?? found?.value;
      if (val != null) total += Number(val) || 0;
    }
    return total;
  };

  return {
    calories:            get([2047, 1008]),
    protein:             get([1003]),
    fat:                 get([1004]),
    carbohydrates:       get([1005]),
    water:               get([1051]),
    fiber:               get([1079]),
    sugarTotal:          get([1063, 2000]),
    sucrose:             get([1010]),
    glucose:             get([1011]),
    fructose:            get([1012]),
    lactose:             get([1013]),
    maltose:             get([1014]),
    saturatedFat:        get([1258]),
    monounsaturatedFat:  get([1292]),
    polyunsaturatedFat:  get([1293]),
    transFat:            get([1257]),
    cholesterol:         get([1253]),
    omega3:              sum([1271, 1278, 1272, 1280]),
    omega6:              sum([1269, 1270]),
    omega9:              get([1259]),
    calcium:             get([1087]),
    iron:                get([1089]),
    magnesium:           get([1090]),
    phosphorus:          get([1091]),
    potassium:           get([1092]),
    sodium:              get([1093]),
    zinc:                get([1095]),
    copper:              get([1098]),
    manganese:           get([1101]),
    iodine:              get([1100]),
    selenium:            get([1103]),
    vitaminC:            get([1162]),
    thiamin:             get([1165]),
    riboflavin:          get([1166]),
    niacin:              get([1167]),
    pantothenicAcid:     get([1170]),
    vitaminB6:           get([1175]),
    biotin:              get([1176]),
    folate:              get([1177]),
    vitaminB12:          get([1178]),
    vitaminA:            get([1106, 1104]),
    retinol:             get([1105]),
    betaCarotene:        get([1107]),
    vitaminD:            get([1114]),
    vitaminD2:           get([1111]),
    vitaminD3:           get([1112]),
    vitaminE:            get([1109]),
    vitaminK:            get([1185]),
    lysine:              get([1214]),
    methionine:          get([1215]),
    tryptophan:          get([1210]),
    threonine:           get([1211]),
    isoleucine:          get([1212]),
    leucine:             get([1213]),
    cystine:             get([1216]),
    phenylalanine:       get([1217]),
    tyrosine:            get([1218]),
    valine:              get([1219]),
    arginine:            get([1220]),
    histidine:           get([1221]),
    alanine:             get([1222]),
    asparticAcid:        get([1223]),
    glutamicAcid:        get([1224]),
    glycine:             get([1225]),
    proline:             get([1226]),
    serine:              get([1227]),
  };
}

async function fetchUSDAFood(fdcId: number): Promise<any> {
  const url = `${USDA_FOOD_URL}/${fdcId}?api_key=${usdaApiKey()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USDA API error ${response.status} for fdcId ${fdcId}`);
  }
  return response.json();
}

async function main() {
  const items = await prisma.foodItem.findMany({
    where: { fdcId: { not: null } },
    orderBy: { nameRu: "asc" },
  });

  console.log(`Found ${items.length} items with fdcId. Starting enrichment...`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.fdcId) continue;

    try {
      const food = await fetchUSDAFood(item.fdcId);
      const parsed = parseUSDA(food);

      await prisma.foodItem.update({
        where: { id: item.id },
        data: parsed,
      });

      success++;
      if ((i + 1) % 50 === 0 || i === 0 || i === items.length - 1) {
        console.log(`  [${i + 1}/${items.length}] ${item.nameRu} -> OK`);
      }
    } catch (err) {
      failed++;
      console.warn(`  [${i + 1}/${items.length}] ${item.nameRu} -> FAIL: ${(err as any)?.message || err}`);
    }

    // Rate limit: ~2 req/s max (3600/hr)
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
