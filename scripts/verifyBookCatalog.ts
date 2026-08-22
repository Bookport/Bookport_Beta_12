/**
 * Read-only diagnostic Book catalog verifier (Phase 1).
 *
 * Walks all 151 BookRecipe entries and resolves each through the SAME
 * deterministic resolver the app uses (src/utils/bookRecipeNutrients), so this
 * is NOT a second parallel resolver. Tallies complete/partial,
 * ingredient_unresolved, weight_missing, forbidden, cycles, excluded, prints
 * every blocker, validates book-ingredient-decisions.json references against
 * the DB and back-data, and exits 1 ONLY when cycles>0 or forbidden>0.
 * partial / ingredient_unresolved / weight_missing are informational this phase.
 */
import {
  resolveBookRecipeNutrients,
  splitAmount,
  cleanName,
  resolveBookName,
} from "../src/utils/bookRecipeNutrients";
import { normalize } from "../src/utils/ingredientMappingCore";
import { breakfastBackData } from "../src/data/breakfast_back";
import { lunchBackData } from "../src/data/lunch_back";
import { dinnerBackData } from "../src/data/dinner_back";
import { mustHaveBackData } from "../src/data/must_have_back";
import { recipeDayBackData } from "../src/data/recipe_day_back";
import { complimentsBackData } from "../src/data/compliments_back";
import type { StructuredIngredient } from "../src/data/compliments_back";
import { prisma } from "../src/prisma";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const DECISIONS_PATH = fileURLToPath(new URL("../book-ingredient-decisions.json", import.meta.url));

interface Blocker {
  recipeId: string;
  category: string;
  line: string;
  reason: string;
}

const SOURCES: Array<{
  type: string;
  data: Array<{
    id: string;
    title: string;
    ingredients: string[];
    structuredIngredients?: StructuredIngredient[];
    selectedLegume?: string;
  }>;
}> = [
  { type: "breakfast", data: breakfastBackData },
  { type: "lunch", data: lunchBackData },
  { type: "dinner", data: dinnerBackData },
  { type: "must_have", data: mustHaveBackData },
  { type: "recipe_of_day", data: recipeDayBackData },
  { type: "compliment", data: complimentsBackData },
];

const normKey = (s: string) => normalize(cleanName(s));

async function main() {
  const decisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf8"));

  const items = await prisma.foodItem.findMany({ select: { nameRu: true, wfpbStatus: true } });
  const index = new Map<string, { nameRu: string; wfpbStatus: string }>();
  const statusByRu = new Map<string, string>();
  for (const it of items) {
    const key = normalize(it.nameRu);
    if (key && !index.has(key)) index.set(key, { nameRu: it.nameRu, wfpbStatus: it.wfpbStatus });
    statusByRu.set(it.nameRu, it.wfpbStatus);
  }

  const recipeIds = new Set<string>();
  const recipes: Array<{
    type: string;
    id: string;
    num: number;
    title: string;
    lines: string[];
    structuredIngredients?: StructuredIngredient[];
    selectedLegume?: string;
  }> = [];
  for (const s of SOURCES) {
    for (const e of s.data) {
      const m = e.id.match(/(\d+)$/);
      if (!m) continue;
      recipes.push({
        type: s.type,
        id: e.id,
        num: Number(m[1]),
        title: e.title,
        lines: e.ingredients,
        structuredIngredients: e.structuredIngredients,
        selectedLegume: e.selectedLegume,
      });
      recipeIds.add(e.id);
    }
  }
  const total = recipes.length;

  const overrides = new Map<string, StructuredIngredient[]>();
  for (const r of recipes) {
    if (r.structuredIngredients?.length) overrides.set(r.id, r.structuredIngredients);
  }

  let complete = 0;
  let partial = 0;
  let ingredient_unresolved = 0;
  let weight_missing = 0;
  let forbidden = 0;
  let excluded = 0;
  let bazAliasUsage = 0;
  const gramDefaultsApplied: Array<{ recipeId: string; line: string; foodKey: string; grams: number; ruleId: string }> = [];
  const p2Exclusions: Array<{ recipeId: string; line: string; reason: string; ruleId: string }> = [];
  const blockers: Blocker[] = [];

  const origInfo = console.info;
  console.info = () => {};

  for (const r of recipes) {
    const res = await resolveBookRecipeNutrients(r.type, r.num);
    if (res.status === "complete") complete++;
    else partial++;
    for (const ing of res.ingredients) {

      if (ing.unresolvedReason === "ingredient_unresolved") {
        ingredient_unresolved++;
        blockers.push({
          recipeId: r.id,
          category: "ingredient_unresolved",
          line: ing.rawName,
          reason: `No FoodItem / synonym for "${ing.normalizedName}"`,
        });
      } else if (ing.unresolvedReason === "weight_missing") {
        weight_missing++;
        blockers.push({
          recipeId: r.id,
          category: "weight_missing",
          line: ing.rawName,
          reason: "No grams parsed for ingredient amount",
        });
      } else if (ing.excluded) {
        excluded++;
      }
      if (ing.foodItemNameRu) {
        const st = statusByRu.get(ing.foodItemNameRu);
        if (st && st !== "green") {
          forbidden++;
          blockers.push({
            recipeId: r.id,
            category: "forbidden",
            line: ing.rawName,
            reason: `${ing.foodItemNameRu} wfpbStatus=${st}`,
          });
        }
      }
      if (ing.gramDefaultRuleId) {
        gramDefaultsApplied.push({
          recipeId: r.id,
          line: ing.rawName,
          foodKey: ing.foodItemNameRu ?? "",
          grams: ing.grams ?? 0,
          ruleId: ing.gramDefaultRuleId,
        });
      }
      if (ing.excludedRuleId) {
        p2Exclusions.push({
          recipeId: r.id,
          line: ing.rawName,
          reason: ing.excludedReason ?? "",
          ruleId: ing.excludedRuleId,
        });
      }
      if (ing.normalizedName && normalize(ing.normalizedName) === "баз") bazAliasUsage++;
    }
  }

  console.info = origInfo;

  // ---- decisions: foodKey -> existing green FoodItem ----
  const foodKeys = new Set<string>();
  const collectFoodKeys = (obj: any) => {
    if (!obj || typeof obj !== "object") return;
    if (typeof obj.foodKey === "string") foodKeys.add(obj.foodKey);
    for (const arrKey of ["components", "perHandful"]) {
      if (Array.isArray(obj[arrKey])) obj[arrKey].forEach(collectFoodKeys);
    }
    if (Array.isArray(obj?.batch?.components)) obj.batch.components.forEach(collectFoodKeys);
    if (Array.isArray(obj?.whenOnePiece?.components)) obj.whenOnePiece.components.forEach(collectFoodKeys);
    if (typeof obj?.selectedLegume === "string") foodKeys.add(obj.selectedLegume);
    if (obj?.recipeSpecific && typeof obj.recipeSpecific === "object") {
      for (const v of Object.values(obj.recipeSpecific)) collectFoodKeys(v);
    }
  };
  if (decisions?.globalRules?.misoIngredient?.foodKey) foodKeys.add(decisions.globalRules.misoIngredient.foodKey);
  for (const gd of decisions?.globalRules?.gramDefaults ?? []) {
    if (typeof gd?.ingredientKey === "string") foodKeys.add(gd.ingredientKey);
  }
  for (const ing of decisions?.ingredients ?? []) collectFoodKeys(ing);

  const foodKeyIssues: Blocker[] = [];
  for (const fk of [...foodKeys].sort()) {
    const resolved = resolveBookName(fk, index);
    if (!resolved) {
      foodKeyIssues.push({
        recipeId: "decisions",
        category: "foodkey_missing",
        line: fk,
        reason: `No FoodItem resolves for foodKey "${fk}"`,
      });
    } else if (statusByRu.get(resolved) !== "green") {
      foodKeyIssues.push({
        recipeId: "decisions",
        category: "foodkey_not_green",
        line: fk,
        reason: `foodKey "${fk}" -> "${resolved}" wfpbStatus=${statusByRu.get(resolved)}`,
      });
    }
  }

  // ---- decisions: referenced recipe ids exist ----
  const referencedIds = new Set<string>();
  const collectRefs = (obj: any) => {
    if (!obj || typeof obj !== "object") return;
    if (typeof obj.sourceRecipeId === "string") referencedIds.add(obj.sourceRecipeId);
    if (typeof obj.recipeId === "string") referencedIds.add(obj.recipeId);
    if (obj?.recipeSpecific && typeof obj.recipeSpecific === "object") {
      for (const k of Object.keys(obj.recipeSpecific)) referencedIds.add(k);
    }
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) v.forEach(collectRefs);
      else if (v && typeof v === "object") collectRefs(v);
    }
  };
  for (const ing of decisions?.ingredients ?? []) collectRefs(ing);
  collectRefs(decisions?.globalRules);
  const missingIds = [...referencedIds].filter((id) => !recipeIds.has(id));

  // ---- cycles over recipe-reference graph ----
  const ingNamesByRecipe = new Map<string, string[]>();
  for (const r of recipes) {
    const names: string[] = [];
    for (const line of r.lines) {
      const sp = splitAmount(line);
      const nm = sp ? cleanName(sp.name) : cleanName(line);
      if (nm) names.push(normKey(nm));
    }
    ingNamesByRecipe.set(r.id, names);
  }

  const textRefs: Array<{ sourceName: string; target: string }> = [];
  for (const ing of decisions?.ingredients ?? []) {
    const target =
      ing?.sourceRecipeId ||
      (typeof ing?.action === "string" && ing.action.startsWith("recipe_") && ing.recipeId) ||
      null;
    if (target && typeof ing.sourceName === "string") textRefs.push({ sourceName: ing.sourceName, target });
  }

  const adj = new Map<string, Set<string>>();
  for (const r of recipes) {
    const names = ingNamesByRecipe.get(r.id) ?? [];
    for (const tr of textRefs) {
      const sk = normKey(tr.sourceName);
      if (sk && names.includes(sk)) {
        if (!adj.has(r.id)) adj.set(r.id, new Set());
        adj.get(r.id)!.add(tr.target);
      }
    }
  }

  const allNodes = new Set<string>([...recipeIds, ...[...adj.values()].flatMap((s) => [...s])]);
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];
  const cyclePaths: string[][] = [];
  const dfs = (n: string) => {
    if (inStack.has(n)) {
      const i = stack.indexOf(n);
      cyclePaths.push([...stack.slice(i), n]);
      return;
    }
    if (visited.has(n)) return;
    visited.add(n);
    inStack.add(n);
    stack.push(n);
    for (const m of adj.get(n) ?? []) dfs(m);
    stack.pop();
    inStack.delete(n);
  };
  for (const n of allNodes) dfs(n);
  const cycles = cyclePaths.length;
  for (const p of cyclePaths) {
    blockers.push({ recipeId: p.join(" -> "), category: "cycle", line: "(reference graph)", reason: "Recursive recipe reference cycle" });
  }

  // ---- decisions: explicit blockers ----
  const decisionBlockers: Blocker[] = [];
  for (const ing of decisions?.ingredients ?? []) {
    if (ing?.blocker && typeof ing.blocker === "object") {
      decisionBlockers.push({
        recipeId: ing.recipeId ?? ing.sourceRecipeId ?? "decisions",
        category: `blocker:${ing.blocker.code ?? "unknown"}`,
        line: ing.sourceName,
        reason: ing.blocker.reason ?? "",
      });
    }
  }

  // ---- decisions: gramDefaults well-formedness ----
  const gramDefaultIssues: Blocker[] = [];
  for (const gd of decisions?.globalRules?.gramDefaults ?? []) {
    if (!gd || typeof gd.ruleId !== "string" || typeof gd.ingredientKey !== "string" || typeof gd.gramsWhenMissing !== "number" || gd.gramsWhenMissing <= 0) {
      gramDefaultIssues.push({
        recipeId: "decisions",
        category: "gramDefault_malformed",
        line: gd ? JSON.stringify(gd) : "(null)",
        reason: "gramDefaults entry must have ruleId (string), ingredientKey (string), gramsWhenMissing (>0)",
      });
    }
  }

  // ---- recipes: selectedLegume -> existing green FoodItem ----
  for (const r of recipes) {
    if (!r.selectedLegume) continue;
    const resolved = resolveBookName(r.selectedLegume, index);
    if (!resolved) {
      foodKeyIssues.push({
        recipeId: r.id,
        category: "selectedLegume_missing",
        line: r.selectedLegume,
        reason: `selectedLegume "${r.selectedLegume}" does not resolve to a FoodItem`,
      });
    } else if (statusByRu.get(resolved) !== "green") {
      foodKeyIssues.push({
        recipeId: r.id,
        category: "selectedLegume_not_green",
        line: r.selectedLegume,
        reason: `selectedLegume -> "${resolved}" wfpbStatus=${statusByRu.get(resolved)}`,
      });
    }
  }

  // ---- report ----
  console.log("Book catalog verification (Phase 1, diagnostic)");
  console.log(`total=${total} complete=${complete} partial=${partial}`);
  console.log(
    `ingredient_unresolved=${ingredient_unresolved} weight_missing=${weight_missing} forbidden=${forbidden} cycles=${cycles} excluded=${excluded}`
  );

  if (blockers.length) {
    console.log("\nblockers:");
    for (const b of blockers) console.log(`  [${b.recipeId}] ${b.category} — "${b.line}" — ${b.reason}`);
  }
  if (foodKeyIssues.length) {
    console.log("\ndecisions foodKey issues (Phase 2 work):");
    for (const b of foodKeyIssues) console.log(`  [${b.recipeId}] ${b.category} — "${b.line}" — ${b.reason}`);
  }
  if (missingIds.length) {
    console.log("\ndecisions recipeId issues:");
    for (const id of missingIds) console.log(`  [decisions] recipeId_missing — ${id} — recipe not found in back-data`);
  }
  if (decisionBlockers.length) {
    console.log("\ndecisions explicit blockers:");
    for (const b of decisionBlockers) console.log(`  [${b.recipeId}] ${b.category} — "${b.line}" — ${b.reason}`);
  }
  if (gramDefaultIssues.length) {
    console.log("\ndecisions gramDefaults issues:");
    for (const b of gramDefaultIssues) console.log(`  [${b.recipeId}] ${b.category} — "${b.line}" — ${b.reason}`);
  }

  // ---- gram defaults applied ----
  const byGramRule = new Map<string, number>();
  for (const a of gramDefaultsApplied) byGramRule.set(a.ruleId, (byGramRule.get(a.ruleId) ?? 0) + 1);
  console.log(`\ngram_defaults_applied=${gramDefaultsApplied.length} baz_alias_usage=${bazAliasUsage}`);
  for (const [rid, c] of [...byGramRule.entries()].sort()) console.log(`  ${rid}: ${c}`);
  for (const a of gramDefaultsApplied) {
    console.log(`  [${a.recipeId}] ${a.ruleId} ${a.grams}g :: "${a.line}" -> ${a.foodKey}`);
  }

  // ---- P2 exclusions applied ----
  const byP2Rule = new Map<string, number>();
  for (const a of p2Exclusions) byP2Rule.set(a.ruleId, (byP2Rule.get(a.ruleId) ?? 0) + 1);
  console.log(`\np2_exclusions_applied=${p2Exclusions.length}`);
  for (const [rid, c] of [...byP2Rule.entries()].sort()) console.log(`  ${rid}: ${c}`);
  for (const a of p2Exclusions) {
    console.log(`  [${a.recipeId}] ${a.ruleId} :: "${a.line}" :: ${a.reason}`);
  }

  const fail = cycles > 0 || forbidden > 0;
  console.log(
    `\nverdict: ${fail ? "FAIL (cycles/forbidden > 0)" : "PASS (diagnostic)"} — partial/unresolved are informational this phase`
  );

  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", (err as Error).message);
  process.exit(1);
});