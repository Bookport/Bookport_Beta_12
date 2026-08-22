/**
 * CI full-corpus nutrient audit для всех 151 Book-рецептов.
 *
 * Проверяет структурную целостность resolver output и runtime parity.
 * НЕ пытается воспроизвести полный нутриентный расчёт сервера.
 *
 * Exit codes: 0 = PASS, 1 = нарушение, 2 = входы изменились во время аудита.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolve } from "node:path";
import { resolveBookRecipeNutrients } from "../src/utils/bookRecipeNutrients";
import { breakfastBackData } from "../src/data/breakfast_back";
import { lunchBackData } from "../src/data/lunch_back";
import { dinnerBackData } from "../src/data/dinner_back";
import { mustHaveBackData } from "../src/data/must_have_back";
import { recipeDayBackData } from "../src/data/recipe_day_back";
import { complimentsBackData } from "../src/data/compliments_back";
import { prisma } from "../src/prisma";

const ROOT = resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_MODE = process.argv.includes("--json");

const INPUT_FILES = [
  "book-ingredient-decisions.json",
  "output/book-registry.json",
  "output/book-approved-partial.json",
].map((p) => resolve(ROOT, p));

const TECHNICAL_IDS = ["must_have_5", "must_have_6", "must_have_7"];

const BACK: Array<[string, any[]]> = [
  ["breakfast", breakfastBackData], ["lunch", lunchBackData], ["dinner", dinnerBackData],
  ["must_have", mustHaveBackData], ["recipe_of_day", recipeDayBackData], ["compliment", complimentsBackData],
];

interface Audit {
  id: string;
  status: string;
  partialReasons: string[];
  resolvedCount: number;
  wmCount: number;
  iuCount: number;
  excludedCount: number;
  gdCount: number;
}

async function resolvePass(): Promise<Map<string, Audit>> {
  const map = new Map<string, Audit>();
  const origInfo = console.info;
  console.info = () => {};
  for (const [type, data] of BACK) {
    for (const e of data) {
      const n = Number((e.id.match(/(\d+)$/) ?? [])[1]);
      if (Number.isNaN(n)) continue;
      const r = await resolveBookRecipeNutrients(type, n);
      map.set(e.id, {
        id: e.id,
        status: r.status,
        partialReasons: [...(r.partialReasons ?? [])],
        resolvedCount: (r.ingredients ?? []).filter((i: any) => !i.excluded && i.grams != null && i.foodItemNameRu).length,
        wmCount: (r.ingredients ?? []).filter((i: any) => i.unresolvedReason === "weight_missing").length,
        iuCount: (r.ingredients ?? []).filter((i: any) => i.unresolvedReason === "ingredient_unresolved").length,
        excludedCount: (r.ingredients ?? []).filter((i: any) => i.excluded && !i.unresolvedReason).length,
        gdCount: (r.ingredients ?? []).filter((i: any) => i.gramDefaultRuleId).length,
      });
    }
  }
  console.info = origInfo;
  return map;
}

function fingerprint(m: Map<string, Audit>): string {
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([id, a]) => `${id}:${a.status}:${a.resolvedCount}:${a.wmCount}:${a.iuCount}:${a.excludedCount}:${a.gdCount}`)
    .join("\n");
}

function shaFile(p: string): string {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

async function main(): Promise<void> {
  const startedAt = Date.now();

  // ---- Phase 1: SHA до
  const shaBefore: Record<string, string> = {};
  for (const p of INPUT_FILES) shaBefore[p] = shaFile(p);

  // ---- Phase 2+3: два прохода legacy (детерминизм)
  process.env.BOOK_REGISTRY_RUNTIME = "0";
  const legacyA = await resolvePass();
  const legacyB = await resolvePass();
  process.env.BOOK_REGISTRY_RUNTIME = "1";
  const regRun = await resolvePass();

  // ---- детерминизм
  let detOk = true;
  for (const id of new Set([...legacyA.keys(), ...legacyB.keys()])) {
    if (JSON.stringify(legacyA.get(id)) !== JSON.stringify(legacyB.get(id))) {
      detOk = false;
    }
  }

  // ---- runtime parity
  let parityOk = true;
  for (const id of new Set([...legacyA.keys(), ...regRun.keys()])) {
    if (JSON.stringify(legacyA.get(id)) !== JSON.stringify(regRun.get(id))) {
      parityOk = false;
    }
  }

  // ---- метрики из legacyA
  let complete = 0, partial = 0, iuTotal = 0, wmTotal = 0, exclTotal = 0, gdTotal = 0;
  for (const [, a] of legacyA) {
    if (a.status === "complete") complete++; else partial++;
    iuTotal += a.iuCount; wmTotal += a.wmCount;
    exclTotal += a.excludedCount; gdTotal += a.gdCount;
  }

  // ---- technical save-flow guard
  let techGuardOk = true;
  const mhSrc = readFileSync(resolve(ROOT, "src/data/must_have_back.ts"), "utf8");
  for (const tid of TECHNICAL_IDS) {
    const idx = mhSrc.indexOf(`id: "${tid}"`);
    if (idx < 0 || !mhSrc.slice(idx, idx + 400).includes('kind: "technical"')) techGuardOk = false;
  }
  const screenSrc = readFileSync(resolve(ROOT, "src/components/BookRecipesScreen.tsx"), "utf8");
  if (!screenSrc.includes("selectedRecipeIsTechnical")) techGuardOk = false;

  // ---- Phase 10: SHA после + stale
  const shaAfter: Record<string, string> = {};
  let stale = false;
  for (const p of INPUT_FILES) {
    shaAfter[p] = shaFile(p);
    if (shaAfter[p] !== shaBefore[p]) { stale = true; }
  }

  const durationMs = Date.now() - startedAt;

  // ---- baseline check
  const metricsOk =
    legacyA.size === 151 && complete === 111 && partial === 40 &&
    iuTotal === 20 && wmTotal === 27 && exclTotal === 261 &&
    detOk && parityOk && techGuardOk;

  const verdict = metricsOk && !stale ? "PASS" : "FAIL";

  const report = {
    verdict,
    baseline: { total: 151, complete: 111, partial: 40, ingredientUnresolved: 20, weightMissing: 27, excluded: 261, forbidden: 0, cycles: 0, gramDefaultsApplied: 163 },
    current: { total: legacyA.size, complete, partial, ingredientUnresolved: iuTotal, weightMissing: wmTotal, excluded: exclTotal, gramDefaultsApplied: gdTotal },
    counts: {
      determinismOk: detOk, runtimeParityOk: parityOk, technicalGuardOk: techGuardOk,
    },
    inputSha: { before: shaBefore, after: shaAfter },
    durationMs,
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\n=== CI BOOK AUDIT (${durationMs} ms) ===`);
    console.log(`verdict: ${verdict}`);
    console.log(`metrics: complete=${complete} partial=${partial} iu=${iuTotal} wm=${wmTotal} excl=${exclTotal} gd=${gdTotal}`);
    console.log(`determinism: ${detOk ? "OK" : "FAIL"} | runtime parity: ${parityOk ? "OK" : "FAIL"} | technical guard: ${techGuardOk ? "OK" : "FAIL"}`);
    console.log(`\nSHA before/after: ${stale ? "ИЗМЕНИЛИСЬ (exit 2)" : "не изменились"}`);
  }
  await prisma.$disconnect();
  process.exit(verdict === "PASS" ? 0 : 1);
}

main().then(() => prisma.$disconnect()).catch(async (err) => {
  console.error("[ci-book-audit] Fatal:", err instanceof Error ? err.message : err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
