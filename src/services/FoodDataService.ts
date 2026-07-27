import { prisma } from "../prisma";
import { callLLM } from "./llmAdapter";
import { directFetch } from "../utils/directFetch";
import { classifyIngredient } from "../utils/wfpbRules";
import { INGREDIENT_TRANSLATIONS } from "../data/ingredientTranslations";

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1/foods/search";

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

export interface IngredientNutrition {
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  water: number;
  fiber: number;
  sugarTotal: number;
  sucrose: number;
  glucose: number;
  fructose: number;
  lactose: number;
  maltose: number;
  saturatedFat: number;
  monounsaturatedFat: number;
  polyunsaturatedFat: number;
  transFat: number;
  cholesterol: number;
  omega3: number;
  omega6: number;
  omega9: number;
  calcium: number;
  iron: number;
  magnesium: number;
  phosphorus: number;
  potassium: number;
  sodium: number;
  zinc: number;
  copper: number;
  manganese: number;
  iodine: number;
  selenium: number;
  vitaminC: number;
  thiamin: number;
  riboflavin: number;
  niacin: number;
  pantothenicAcid: number;
  vitaminB6: number;
  biotin: number;
  folate: number;
  vitaminB12: number;
  vitaminA: number;
  retinol: number;
  betaCarotene: number;
  vitaminD: number;
  vitaminD2: number;
  vitaminD3: number;
  vitaminE: number;
  vitaminK: number;
  lysine: number;
  methionine: number;
  tryptophan: number;
  threonine: number;
  isoleucine: number;
  leucine: number;
  cystine: number;
  phenylalanine: number;
  tyrosine: number;
  valine: number;
  arginine: number;
  histidine: number;
  alanine: number;
  asparticAcid: number;
  glutamicAcid: number;
  glycine: number;
  proline: number;
  serine: number;
}

function translateRuToEn(name: string): string | null {
  if (INGREDIENT_TRANSLATIONS[name]) return INGREDIENT_TRANSLATIONS[name];
  let bestKey = "";
  let bestValue: string | null = null;
  for (const [key, value] of Object.entries(INGREDIENT_TRANSLATIONS)) {
    if (name.includes(key) && key.length > bestKey.length) {
      bestKey = key;
      bestValue = value;
    }
  }
  return bestValue;
}

export async function getIngredientData(ruName: string): Promise<IngredientNutrition | null> {
  const normalized = ruName.toLowerCase().trim();
  if (!normalized) return null;

  // 1. Поиск по nameRu (точное совпадение)
  let existing = await prisma.foodItem.findFirst({
    where: { nameRu: { equals: normalized, mode: "insensitive" } },
  });
  if (existing) {
    return mapFoodItemToNutrition(existing);
  }

  // 2. Перевод: словарь → LLM (fallback)
  let englishName = translateRuToEn(normalized) || "";
  if (!englishName) {
    try {
      const llmResult = await callLLM({
        config: {
          systemInstruction:
            "You are a USDA database query assistant. Translate the Russian ingredient name to English exactly as it appears in USDA FoodData Central. Rules: 1) Always use raw or dry state. 2) Format: 'Product, descriptor, raw'. 3) Examples: гречка → buckwheat, raw | рис → rice, white, long-grain, raw | вареный рис → rice, white, long-grain, cooked. Return ONLY the English string, nothing else.",
          temperature: 0.1,
          maxOutputTokens: 100,
        },
        messages: [{ role: "user", content: normalized }],
      });
      englishName = (llmResult?.text || "").trim();
    } catch (err) {
      console.warn("[FoodDataService] LLM translation failed:", (err as any)?.message || err);
      return null;
    }
  }

  if (!englishName) return null;

  // 4. Запрос USDA API
  let food: any;
  try {
    const url = `${USDA_BASE}?query=${encodeURIComponent(englishName)}&dataType=Foundation,SR%20Legacy&pageSize=5&api_key=${usdaApiKey()}`;
    const response = await directFetch(url);
    if (!response.ok) {
      console.warn(`[FoodDataService] USDA API error ${response.status}`);
      return null;
    }
    const data = await response.json();
    const foods: any[] = data.foods || [];
    food = foods.find(
      (f: any) => f.dataType === "Foundation" || f.dataType === "SR Legacy"
    ) || foods[0];
    if (!food) return null;
  } catch (err) {
    console.warn("[FoodDataService] USDA fetch failed:", (err as any)?.message || err);
    return null;
  }

  // 5. Парсинг
  const parsed = parseUSDA(food);

  // 6. Определение WFPB-статуса
  const classification = classifyIngredient(normalized);
  const wfpbStatus = classification.isForbidden ? "forbidden" : "green";

  // 7. Сохранение в БД
  try {
    await prisma.foodItem.create({
      data: {
        nameRu: normalized,
        nameEn: englishName,
        fdcId: food.fdcId,
        wfpbStatus,
        ...parsed,
      },
    });
  } catch (err) {
    console.warn("[FoodDataService] Save failed:", (err as any)?.message || err);
  }

  return parsed;
}

function mapFoodItemToNutrition(item: any): IngredientNutrition {
  return {
    calories:           item.calories,
    protein:            item.protein,
    fat:                item.fat,
    carbohydrates:      item.carbohydrates,
    water:              item.water,
    fiber:              item.fiber,
    sugarTotal:         item.sugarTotal,
    sucrose:            item.sucrose,
    glucose:            item.glucose,
    fructose:           item.fructose,
    lactose:            item.lactose,
    maltose:            item.maltose,
    saturatedFat:       item.saturatedFat,
    monounsaturatedFat: item.monounsaturatedFat,
    polyunsaturatedFat: item.polyunsaturatedFat,
    transFat:           item.transFat,
    cholesterol:        item.cholesterol,
    omega3:             item.omega3,
    omega6:             item.omega6,
    omega9:             item.omega9,
    calcium:            item.calcium,
    iron:               item.iron,
    magnesium:          item.magnesium,
    phosphorus:         item.phosphorus,
    potassium:          item.potassium,
    sodium:             item.sodium,
    zinc:               item.zinc,
    copper:             item.copper,
    manganese:          item.manganese,
    iodine:             item.iodine,
    selenium:           item.selenium,
    vitaminC:           item.vitaminC,
    thiamin:            item.thiamin,
    riboflavin:         item.riboflavin,
    niacin:             item.niacin,
    pantothenicAcid:    item.pantothenicAcid,
    vitaminB6:          item.vitaminB6,
    biotin:             item.biotin,
    folate:             item.folate,
    vitaminB12:         item.vitaminB12,
    vitaminA:           item.vitaminA,
    retinol:            item.retinol,
    betaCarotene:       item.betaCarotene,
    vitaminD:           item.vitaminD,
    vitaminD2:          item.vitaminD2,
    vitaminD3:          item.vitaminD3,
    vitaminE:           item.vitaminE,
    vitaminK:           item.vitaminK,
    lysine:             item.lysine,
    methionine:         item.methionine,
    tryptophan:         item.tryptophan,
    threonine:          item.threonine,
    isoleucine:         item.isoleucine,
    leucine:            item.leucine,
    cystine:            item.cystine,
    phenylalanine:      item.phenylalanine,
    tyrosine:           item.tyrosine,
    valine:             item.valine,
    arginine:           item.arginine,
    histidine:          item.histidine,
    alanine:            item.alanine,
    asparticAcid:       item.asparticAcid,
    glutamicAcid:       item.glutamicAcid,
    glycine:            item.glycine,
    proline:            item.proline,
    serine:             item.serine,
  };
}
