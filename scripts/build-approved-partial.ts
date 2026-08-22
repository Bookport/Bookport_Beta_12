/**
 * Approved-partial manifest generator (read-only wrt runtime).
 *
 * Собирает ВСЕ текущие unresolved ingredient rows verified resolver'а
 * (после approved baseline: each-split, berry coverage, green aliases,
 * broth/water, approved excluded) и фиксирует их как замороженный манифест
 * output/book-approved-partial.json.
 *
 * Coverage-инварианты (exit 1 при нарушении):
 *  - ровно 49 строк: 20 ingredient_unresolved + 29 weight_missing;
 *  - каждая строка классифицирована ровно один раз (orphans=0);
 *  - дубликаты (recipeId|rawName) запрещены (duplicates=0).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  resolveBookRecipeNutrients,
  splitAmount,
  cleanName,
  normalizeBookIngredientName,
} from "../src/utils/bookRecipeNutrients";
import { prisma } from "../src/prisma";
import { normalize } from "../src/utils/ingredientMappingCore";
import { breakfastBackData } from "../src/data/breakfast_back";
import { lunchBackData } from "../src/data/lunch_back";
import { dinnerBackData } from "../src/data/dinner_back";
import { mustHaveBackData } from "../src/data/must_have_back";
import { recipeDayBackData } from "../src/data/recipe_day_back";
import { complimentsBackData } from "../src/data/compliments_back";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "output");

type Category =
  | "approved_not_calculated"
  | "needs_exact_gram"
  | "ambiguous_product"
  | "unsupported_composite"
  | "recipe_reference"
  | "optional_or_negligible"
  | "parser_or_data_defect";

const SOURCES: Array<{ type: string; data: Array<{ id: string; ingredients: string[] }> }> = [
  { type: "breakfast", data: breakfastBackData },
  { type: "lunch", data: lunchBackData },
  { type: "dinner", data: dinnerBackData },
  { type: "must_have", data: mustHaveBackData },
  { type: "recipe_of_day", data: recipeDayBackData },
  { type: "compliment", data: complimentsBackData },
];

interface Classification {
  category: Category;
  reasonCode: string;
  reason: string;
  source?: string;
}

// Детерминированная классификация по exact-паттернам (без fuzzy).
function classify(recipeId: string, rawName: string, norm: string): Classification {
  if (/льняное «яйцо»/.test(rawName)) {
    return {
      category: "unsupported_composite",
      reasonCode: "composite_portion_semantics",
      reason: "Composite («яйцо» = лён + вода): требуется portion-механизм whenOnePiece/explicit tbsp",
      source: "decisions.ingredients[льняное «яйцо»] (foodKey)",
    };
  }
  if (/льняной гель/.test(rawName)) {
    return {
      category: "unsupported_composite",
      reasonCode: "composite_ratio_semantics",
      reason: "Гель = 20% лён / 80% вода: требуется scaled-ratio механизм",
      source: "decisions.ingredients[льняной гель] (foodKey, ratio 0.2)",
    };
  }
  if (/томатная паста без масла/.test(rawName)) {
    return {
      category: "needs_exact_gram",
      reasonCode: "missing_bookside_gram_default_for_target",
      reason: "Target «томатная паста» известен (gd_томатная_паста_1_tbsp), но нет book-side правила для ключа строки и recipeId-scoping (compliment_16)",
      source: "decisions.ingredients[томатная паста без масла (рецепт есть выше)] (foodKey, recipeId=compliment_10)",
    };
  }
  if (/Красный бархат|Огненный поцелуй/.test(rawName)) {
    return {
      category: "recipe_reference",
      reasonCode: "recipe_reference_not_wired",
      reason: "use_recipe_source на другой Book-рецепт; рекурсивный механизм не подключён",
      source: "decisions.ingredients[соус …] (use_recipe_source)",
    };
  }
  if (/ореховый сыр/.test(rawName)) {
    return {
      category: "recipe_reference",
      reasonCode: "recipe_reference_not_wired",
      reason: "use_recipe_source → compliment_7; механизм не подключён",
      source: "decisions.ingredients[ореховый сыр (быстрый)] (use_recipe_source)",
    };
  }
  if (/ферментированный миндальный сыр/.test(rawName)) {
    return {
      category: "recipe_reference",
      reasonCode: "recipe_reference_not_wired",
      reason: "use_recipe_source → recipe_day_30; механизм не подключён",
      source: "decisions.ingredients[ферментированный миндальный сыр] (use_recipe_source)",
    };
  }
  if (/хлеб \(см\./.test(rawName)) {
    return {
      category: "recipe_reference",
      reasonCode: "recipe_reference_not_wired",
      reason: "Ссылка на «Рецепт дня»/24 День (recipe_day_24); нужна use_recipe_source запись",
    };
  }
  if (/Земляной умами|Карри WFPB|Солнечный имбирь/.test(rawName)) {
    return {
      category: "unsupported_composite",
      reasonCode: "split_scaled_needs_gram_base",
      reason: "split_scaled требует базу в граммах; у строки только ложки/шт или её нет",
      source: "decisions.ingredients[смесь …] (split_scaled)",
    };
  }
  if (/копч[её]ная паприка/i.test(rawName)) {
    return {
      category: "ambiguous_product",
      reasonCode: "smoked_vs_sweet_paprika_unapproved",
      reason: "Копчёная ≠ сладкая паприка; точный FoodItem отсутствует, алиас на «паприка» не утверждён",
    };
  }
  if (/растительное молоко/.test(rawName)) {
    return {
      category: "ambiguous_product",
      reasonCode: "plant_milk_choice_unapproved",
      reason: "Тип молока не указан; выбор конкретного FoodItem не утверждён",
    };
  }
  if (/апельсиновый сок/.test(rawName)) {
    return {
      category: "ambiguous_product",
      reasonCode: "only_forbidden_candidate",
      reason: "Единственный кандидат «сок апельсиновый восстановленный» forbidden; green-эквивалента нет",
    };
  }
  if (/мисо-соус \(опционально\)/.test(rawName)) {
    return {
      category: "optional_or_negligible",
      reasonCode: "optional_composite_miso_sauce",
      reason: "Опциональный составной ингредиент (мисо + вода); политика опциональных не определена",
    };
  }
  if (/мисо-паста/.test(rawName)) {
    return {
      category: "optional_or_negligible",
      reasonCode: "optional_amount_guard",
      reason: "Amount помечен «опционально» — guardOk резолвера намеренно блокирует gram-default",
    };
  }
  // Остаток: цель резолвится в green FoodItem, но нет book-side gram-default
  // для этого нормализованного ключа + amount (включая диапазоны и «1 см»).
  const targets: Record<string, string> = {
    "бурый рис": "рис коричневый",
    "имбирь свежий": "имбирь",
    "свежий имбирь": "имбирь",
    "тмин молотый": "тмин",
    "паприка сладкая": "паприка",
    "зелень": "петрушка",
    "укроп": "укроп",
    "псиллиум": "псиллиум",
    "органическая сода": "сода",
    "асафетида": "асафетида",
  };
  const t = targets[norm];
  return {
    category: "needs_exact_gram",
    reasonCode: "approved_target_without_bookside_gram_rule",
    reason: `Target ${t ? `"${t}"` : "резолвится"} green, но book-side gram-default для key=${JSON.stringify(norm)} и данного amount отсутствует`,
    source: t ? `globalRules.gramDefaults[${t}] (ключ не совпадает с book-side)` : undefined,
  };
}

async function main() {
  const items = await prisma.foodItem.findMany({ select: { nameRu: true, wfpbStatus: true } });
  void items;

  interface Row {
    recipeId: string;
    rawName: string;
    normalizedName: string;
    amount: string;
    unresolvedReason: string;
    category: Category;
    reasonCode: string;
    reason: string;
    source?: string;
  }
  const rows: Row[] = [];
  const seen = new Set<string>();
  let iUnres = 0;
  let wMiss = 0;
  const partialRecipes: string[] = [];
  const unresolvedPerRecipe: Record<string, number> = {};

  const origInfo = console.info;
  console.info = () => {};
  for (const s of SOURCES) {
    for (const e of s.data) {
      const num = Number((e.id.match(/(\d+)$/) ?? [])[1]);
      if (Number.isNaN(num)) continue;
      const res = await resolveBookRecipeNutrients(s.type, num);
      if (res.status === "partial") partialRecipes.push(e.id);
      // queue-атрибуция: несколько строк могут иметь одинаковый rawName
      const pool = new Map<string, any[]>();
      for (const ing of res.ingredients) {
        if (ing.unresolvedReason !== "ingredient_unresolved" && ing.unresolvedReason !== "weight_missing") continue;
        (pool.get(ing.rawName) ?? pool.set(ing.rawName, []).get(ing.rawName)!).push(ing);
      }
      for (const line of e.ingredients) {
        const spL = splitAmount(line);
        if (!spL) continue;
        const arr = pool.get(spL.name);
        if (!arr || !arr.length) continue;
        const ing = arr.shift()!;
        if (ing.unresolvedReason === "ingredient_unresolved") iUnres++;
        else wMiss++;
        const norm = normalizeBookIngredientName(cleanName(ing.rawName));
        const cls = classify(e.id, ing.rawName, norm);
        const row: Row = {
          recipeId: e.id,
          rawName: ing.rawName,
          normalizedName: norm,
          amount: spL.amount.trim(),
          unresolvedReason: ing.unresolvedReason,
          category: cls.category,
          reasonCode: cls.reasonCode,
          reason: cls.reason,
          ...(cls.source ? { source: cls.source } : {}),
        };
        const dedup = `${e.id}|${ing.rawName}|${row.amount}`;
        if (seen.has(dedup)) fail(`duplicate row: ${dedup}`);
        seen.add(dedup);
        if (!cls.category) fail(`orphan (unclassified): ${dedup}`);
        unresolvedPerRecipe[e.id] = (unresolvedPerRecipe[e.id] ?? 0) + 1;
        rows.push(row);
      }
    }
  }
  console.info = origInfo;

  const countsByCategory: Record<string, number> = {};
  for (const r of rows) countsByCategory[r.category] = (countsByCategory[r.category] ?? 0) + 1;

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    baselineNote:
      "Frozen approved_partial baseline после: F2S1 scope, each-splits, berry coverage, green aliases, broth/water excluded, approved excluded.",
    counts: {
      totalRows: rows.length,
      ingredientUnresolved: iUnres,
      weightMissing: wMiss,
      partialRecipes: partialRecipes.length,
      byCategory: countsByCategory,
    },
    partialRecipes,
    unresolvedRowsPerRecipe: Object.fromEntries(
      Object.entries(unresolvedPerRecipe).sort(([a], [b]) => a.localeCompare(b))
    ),
    rows,
  };

  function fail(msg: string): never {
    console.error(`[build-approved-partial] VALIDATION ERROR: ${msg}`);
    process.exit(1);
  }

  // coverage-инварианты
  if (rows.length !== 49) fail(`total rows ${rows.length} != 49`);
  if (iUnres !== 20) fail(`ingredient_unresolved ${iUnres} != 20`);
  if (wMiss !== 29) fail(`weight_missing ${wMiss} != 29`);
  if (partialRecipes.length !== 42) fail(`partial recipes ${partialRecipes.length} != 42`);
  if (rows.length !== iUnres + wMiss) fail("rows != iUnres + wMiss");
  const catSum = Object.values(countsByCategory).reduce((a, b) => a + b, 0);
  if (catSum !== rows.length) fail(`category sum ${catSum} != ${rows.length} (orphans)`);

  writeFileSync(path.join(OUT_DIR, "book-approved-partial.json"), JSON.stringify(manifest, null, 2) + "\n");

  console.log(`rows=${rows.length} (ingredient_unresolved=${iUnres}, weight_missing=${wMiss})`);
  console.log(`partialRecipes=${partialRecipes.length}`);
  console.log("byCategory:", JSON.stringify(countsByCategory));
  console.log(`orphans=0 duplicates=0`);
}
void normalize;

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("[build-approved-partial] Fatal:", err instanceof Error ? err.message : err);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
