import { prisma } from "../src/prisma";

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1/foods/search";
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
    calories: get([2047, 1008]), protein: get([1003]), fat: get([1004]),
    carbohydrates: get([1005]), water: get([1051]), fiber: get([1079]),
    sugarTotal: get([1063, 2000]), sucrose: get([1010]), glucose: get([1011]),
    fructose: get([1012]), lactose: get([1013]), maltose: get([1014]),
    saturatedFat: get([1258]), monounsaturatedFat: get([1292]),
    polyunsaturatedFat: get([1293]), transFat: get([1257]),
    cholesterol: get([1253]), omega3: sum([1271, 1278, 1272, 1280]),
    omega6: sum([1269, 1270]), omega9: get([1259]),
    calcium: get([1087]), iron: get([1089]), magnesium: get([1090]),
    phosphorus: get([1091]), potassium: get([1092]), sodium: get([1093]),
    zinc: get([1095]), copper: get([1098]), manganese: get([1101]),
    iodine: get([1100]), selenium: get([1103]),
    vitaminC: get([1162]), thiamin: get([1165]), riboflavin: get([1166]),
    niacin: get([1167]), pantothenicAcid: get([1170]), vitaminB6: get([1175]),
    biotin: get([1176]), folate: get([1177]), vitaminB12: get([1178]),
    vitaminA: get([1106, 1104]), retinol: get([1105]), betaCarotene: get([1107]),
    vitaminD: get([1114]), vitaminD2: get([1111]), vitaminD3: get([1112]),
    vitaminE: get([1109]), vitaminK: get([1185]),
    lysine: get([1214]), methionine: get([1215]),
    tryptophan: get([1210]), threonine: get([1211]),
    isoleucine: get([1212]), leucine: get([1213]),
    cystine: get([1216]), phenylalanine: get([1217]),
    tyrosine: get([1218]), valine: get([1219]),
    arginine: get([1220]), histidine: get([1221]),
    alanine: get([1222]), asparticAcid: get([1223]),
    glutamicAcid: get([1224]), glycine: get([1225]),
    proline: get([1226]), serine: get([1227]),
  };
}

// Items where fdcId is dead: map nameEn -> better search query
const FIXES: Record<string, { nameEn: string; query: string }> = {
  "Broccoli, raw": { nameEn: "Broccoli, raw", query: "broccoli raw" },
  "egg melange": { nameEn: "Egg, melange, raw", query: "egg melange raw" },
  "peaches, raw": { nameEn: "Peaches, raw", query: "peaches raw" },
  "tomatoes raw": { nameEn: "Tomatoes, cherry, raw", query: "tomatoes cherry raw" },
  "mustard seed, yellow": { nameEn: "Mustard seed, yellow", query: "mustard seed yellow raw" },
  "ricotta cheese": { nameEn: "Cheese, ricotta, whole milk", query: "ricotta cheese whole milk" },
  "cheddar cheese": { nameEn: "Cheese, cheddar", query: "cheddar cheese" },
};

async function searchFood(query: string): Promise<any> {
  const url = `${USDA_BASE}?query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=3&api_key=${usdaApiKey()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Search error ${r.status}`);
  const data = await r.json();
  return data.foods?.find((f: any) => f.dataType === "Foundation" || f.dataType === "SR Legacy") || data.foods?.[0];
}

async function fetchByFdcId(fdcId: number): Promise<any> {
  const url = `${USDA_FOOD_URL}/${fdcId}?api_key=${usdaApiKey()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch error ${r.status}`);
  return r.json();
}

async function main() {
  // First, retry the 2 that now work
  const retryItems = await prisma.foodItem.findMany({
    where: { fdcId: { in: [2003587, 2710825] }, tryptophan: 0 },
  });
  for (const item of retryItems) {
    try {
      const food = await fetchByFdcId(item.fdcId!);
      const parsed = parseUSDA(food);
      await prisma.foodItem.update({ where: { id: item.id }, data: parsed });
      console.log(`Retry OK: ${item.nameRu} (fdcId ${item.fdcId})`);
    } catch (err) {
      console.warn(`Retry FAIL: ${item.nameRu}: ${(err as any).message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // Fix dead fdcIds
  const deadIds = [747447, 747997, 325430, 321360, 326698, 746766, 328637];
  const deadItems = await prisma.foodItem.findMany({
    where: { fdcId: { in: deadIds } },
    orderBy: { nameRu: "asc" },
  });

  for (const item of deadItems) {
    const fix = FIXES[item.nameEn];
    if (!fix) {
      console.warn(`No fix defined for: ${item.nameRu} (${item.nameEn})`);
      continue;
    }
    try {
      const food = await searchFood(fix.query);
      if (!food) {
        console.warn(`Search returned nothing for: ${item.nameRu}`);
        continue;
      }
      const parsed = parseUSDA(food);
      await prisma.foodItem.update({
        where: { id: item.id },
        data: { ...parsed, fdcId: food.fdcId, nameEn: fix.nameEn },
      });
      console.log(`Fixed: ${item.nameRu} -> new fdcId ${food.fdcId} (${food.description})`);
    } catch (err) {
      console.warn(`FAIL: ${item.nameRu}: ${(err as any).message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  const remaining = await prisma.foodItem.count({ where: { tryptophan: 0, fdcId: { not: null } } });
  console.log(`\nRemaining with tryptophan=0: ${remaining}`);
  await prisma.$disconnect();
}

main().catch(console.error);
