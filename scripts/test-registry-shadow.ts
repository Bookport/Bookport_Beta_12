/**
 * Shadow-mode test: 151 recipe, legacy resolver authoritative.
 *
 * Требования:
 *  - 151/151 deep-equal (shadowDiffs = 0, shadowRuns = 151);
 *  - complete=111, partial=40, ingredient_unresolved=20,
 *    weight_missing=27, excluded=261, gram_defaults_applied=163.
 */
import { resolveBookRecipeNutrients } from "../src/utils/bookRecipeNutrients";
import {
  bookRegistryShadowStats,
  flushBookRegistryShadow,
} from "../src/utils/bookRegistryShadow";
import { prisma } from "../src/prisma";
import { normalize } from "../src/utils/ingredientMappingCore";

const BACK_SOURCES: Array<{ type: string; data: Array<{ id: string }> }> = [
  { type: "breakfast", data: (await import("../src/data/breakfast_back")).breakfastBackData },
  { type: "lunch", data: (await import("../src/data/lunch_back")).lunchBackData },
  { type: "dinner", data: (await import("../src/data/dinner_back")).dinnerBackData },
  { type: "must_have", data: (await import("../src/data/must_have_back")).mustHaveBackData },
  { type: "recipe_of_day", data: (await import("../src/data/recipe_day_back")).recipeDayBackData },
  { type: "compliment", data: (await import("../src/data/compliments_back")).complimentsBackData },
];

async function main() {
  const origInfo = console.info;
  console.info = () => {};
  let complete = 0, partial = 0, iUnres = 0, wMiss = 0, excl = 0, forbidden = 0, gdApplied = 0;

  for (const s of BACK_SOURCES) {
    for (const e of s.data) {
      const num = Number((e.id.match(/(\d+)$/) ?? [])[1]);
      if (Number.isNaN(num)) continue;
      const r = await resolveBookRecipeNutrients(s.type, num);
      if (r.status === "complete") complete++; else partial++;
      for (const i of r.ingredients) {
        if (i.unresolvedReason === "ingredient_unresolved") iUnres++;
        else if (i.unresolvedReason === "weight_missing") wMiss++;
        else if (i.excluded) excl++;
        if (i.foodItemNameRu) {
          const rec = await prisma.foodItem.findFirst({ where: { nameRu: i.foodItemNameRu }, select: { wfpbStatus: true } });
          if (rec && rec.wfpbStatus !== "green") forbidden++;
        }
        if (i.gramDefaultRuleId) gdApplied++;
      }
    }
  }
  await flushBookRegistryShadow();
  console.info = origInfo;

  const checks: Array<[string, boolean]> = [
    [`shadowRuns=151 (факт ${bookRegistryShadowStats.runs})`, bookRegistryShadowStats.runs === 151],
    [`shadowDiffs=0 (факт ${bookRegistryShadowStats.diffs})`, bookRegistryShadowStats.diffs === 0],
    [`complete=111 (факт ${complete})`, complete === 111],
    [`partial=40 (факт ${partial})`, partial === 40],
    [`ingredient_unresolved=20 (факт ${iUnres})`, iUnres === 20],
    [`weight_missing=27 (факт ${wMiss})`, wMiss === 27],
    [`excluded=261 (факт ${excl})`, excl === 261],
    [`forbidden=0 (факт ${forbidden})`, forbidden === 0],
    [`gram_defaults_applied=163 (факт ${gdApplied})`, gdApplied === 163],
  ];

  console.log("=== registry shadow test ===");
  for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
  const ok = checks.every(([, v]) => v);
  console.log(ok ? "\nVERDICT: PASS" : "\nVERDICT: FAIL");
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
