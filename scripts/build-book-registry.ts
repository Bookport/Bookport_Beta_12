/**
 * Compiled Book registry generator (read-only wrt runtime).
 *
 * Builds output/book-registry.json + output/book-registry.report.json from:
 *  - book-ingredient-decisions.json
 *  - BOOK_SYNONYMS (src/utils/bookRecipeNutrients)
 *  - back-data (structuredIngredients, recipe ids)
 *  - FoodItem index (Prisma).
 *
 * Runtime registry includes ONLY: aliases, gram defaults, piece defaults,
 * exact excluded decisions, F1B-safe foodKey (×4), F2S1 exact split (×12),
 * exact recipe-specific overrides, structuredIngredients.
 * Everything else (F3/E ambiguity, F1B-defer, S2, split_scaled,
 * use_recipe_source, recipe references) goes to the deferred manifest.
 *
 * Compile-time validation fails (exit 1) on: non-green target in curated
 * decision rules, ratio sum != 1 ±1e-6, duplicate key+matcher with different
 * outcomes, invalid recipeId, non-canonical amount keys.
 */
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import decisions from "../book-ingredient-decisions.json";
import {
  BOOK_SYNONYMS,
  cleanName,
  normalizeBookIngredientName,
  pieceAmountKey,
} from "../src/utils/bookRecipeNutrients";
import { normalize } from "../src/utils/ingredientMappingCore";
import { prisma } from "../src/prisma";
import { breakfastBackData } from "../src/data/breakfast_back";
import { lunchBackData } from "../src/data/lunch_back";
import { dinnerBackData } from "../src/data/dinner_back";
import { mustHaveBackData } from "../src/data/must_have_back";
import { recipeDayBackData } from "../src/data/recipe_day_back";
import { complimentsBackData } from "../src/data/compliments_back";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "output");

interface CompiledTarget {
  foodKey: string;
  resolvedNameRu: string;
  wfpbStatus: "green";
}
interface CompiledComponent {
  foodKey: string;
  resolvedNameRu: string;
  wfpbStatus: "green";
  ratio?: number;
  grams?: number;
}
interface CompiledRule {
  ruleId: string;
  action:
    | "alias"
    | "gram_default"
    | "piece_default"
    | "excluded"
    | "food_key"
    | "split"
    | "split_each"
    | "line_override"
    | "structured";
  normalizedKey: string;
  recipeId?: string;
  amountMatcher?: { kind: "amount_key" | "piece_key" | "exact_line"; value: string };
  target?: CompiledTarget;
  grams?: number;
  gramsSource?: "fixed" | "when_missing" | "parsed_at_runtime";
  components?: CompiledComponent[];
  amountOverrides?: Array<{ matchPieceKey: string; grams: Array<{ resolvedNameRu: string; grams: number }> }>;
  replacementLine?: string;
  transform?: string;
  reason?: string;
  precedence: number;
}
interface DeferredEntry {
  source: string;
  action: string;
  reason: string;
}

const BACK_SOURCES = [
  breakfastBackData,
  lunchBackData,
  dinnerBackData,
  mustHaveBackData,
  recipeDayBackData,
  complimentsBackData,
] as Array<Array<{ id: string; ingredients: string[]; structuredIngredients?: any[] }>>;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const fail = (msg: string): never => {
  console.error(`[build-book-registry] VALIDATION ERROR: ${msg}`);
  process.exit(1);
};

async function main() {
  const items = await prisma.foodItem.findMany({ select: { nameRu: true, wfpbStatus: true } });
  const index = new Map<string, { nameRu: string; wfpbStatus: string }>();
  for (const it of items) {
    const k = normalize(it.nameRu);
    if (k && !index.has(k)) index.set(k, { nameRu: it.nameRu, wfpbStatus: it.wfpbStatus });
  }

  // exact green resolution; used for curated decision rules.
  // Зеркало resolveBookName: прямой матч по normalize(), затем точный
  // синоним из BOOK_SYNONYMS. Без fuzzy.
  const resolveGreen = (foodKey: string): CompiledTarget => {
    const normKey = normalize(foodKey);
    const synonymTarget = (BOOK_SYNONYMS as Record<string, string>)[normKey];
    const rec = index.get(normKey) ?? (synonymTarget ? index.get(normalize(synonymTarget)) : undefined);
    if (!rec) fail(`foodKey "${foodKey}" does not resolve to a FoodItem`);
    if (rec.wfpbStatus !== "green") fail(`foodKey "${foodKey}" -> ${rec.nameRu} wfpbStatus=${rec.wfpbStatus}, expected green`);
    return { foodKey, resolvedNameRu: rec.nameRu, wfpbStatus: "green" };
  };

  const recipeIds = new Set<string>();
  for (const s of BACK_SOURCES) for (const e of s) recipeIds.add(e.id);

  const rules: CompiledRule[] = [];
  const deferred: DeferredEntry[] = [];
  let greenChecks = 0;
  let canonicalAmountChecks = 0;
  let ratioSumChecks = 0;
  let duplicateChecks = 0;

  const seenSigs = new Map<string, string>(); // sig -> ruleId
  const register = (rule: CompiledRule) => {
    const sig = `${rule.action}|${rule.recipeId ?? ""}|${rule.normalizedKey}|${rule.amountMatcher?.value ?? ""}`;
    const prev = seenSigs.get(sig);
    if (prev && JSON.stringify(rules.find((r) => r.ruleId === prev)) !== JSON.stringify(rule)) {
      fail(`duplicate key+matcher with different outcome: "${sig}" (${prev} vs ${rule.ruleId})`);
    }
    duplicateChecks++;
    if (!prev) {
      seenSigs.set(sig, rule.ruleId);
      rules.push(rule);
    }
  };

  // ---- aliases (precedence 70). Key pipeline: normalize() — как в resolveBookName.
  for (const [key, target] of Object.entries(BOOK_SYNONYMS)) {
    const normKey = normalize(key);
    const rec = index.get(normalize(target));
    if (!rec || rec.wfpbStatus !== "green") {
      deferred.push({
        source: `alias:${key}`,
        action: "alias",
        reason: `target_not_green: "${target}" -> ${rec ? rec.wfpbStatus : "unresolved"}`,
      });
      continue;
    }
    greenChecks++;
    register({
      ruleId: `alias:${normKey}`,
      action: "alias",
      normalizedKey: normKey,
      target: { foodKey: normalize(target), resolvedNameRu: rec.nameRu, wfpbStatus: "green" },
      precedence: 70,
    });
  }

  // ---- gram defaults / piece defaults (precedence 60 / 50)
  for (const gd of ((decisions as any).globalRules?.gramDefaults ?? []) as any[]) {
    if (!gd || typeof gd.ingredientKey !== "string" || typeof gd.gramsWhenMissing !== "number" || gd.gramsWhenMissing <= 0) {
      deferred.push({ source: gd?.ruleId ?? "(null)", action: "gram_default", reason: "malformed_gram_default" });
      continue;
    }
    const key = normalize(gd.ingredientKey);
    const target = resolveGreen(gd.ingredientKey);
    greenChecks++;
    const isPiece = typeof gd.pieceAmount === "string" && gd.pieceAmount.trim().length > 0;
    if (isPiece) {
      canonicalAmountChecks++;
      register({
        ruleId: gd.ruleId,
        action: "piece_default",
        normalizedKey: key,
        amountMatcher: { kind: "piece_key", value: pieceAmountKey(gd.pieceAmount) },
        target: resolveGreen(gd.ingredientKey),
        grams: gd.gramsWhenMissing,
        gramsSource: "when_missing",
        precedence: 50,
      });
    } else if (typeof gd.amount === "string") {
      if (!/^\d+(\.\d+)? (tsp|tbsp)$/.test(gd.amount)) {
        fail(`gram default "${gd.ruleId}": non-canonical amount "${String(gd.amount)}"`);
      }
      canonicalAmountChecks++;
      register({
        ruleId: gd.ruleId,
        action: "gram_default",
        normalizedKey: key,
        amountMatcher: { kind: "amount_key", value: gd.amount },
        target,
        grams: gd.gramsWhenMissing,
        gramsSource: "when_missing",
        precedence: 60,
      });
    } else {
      // generic правило без amount (generic-fallback в pickGramRule)
      register({
        ruleId: gd.ruleId,
        action: "gram_default",
        normalizedKey: key,
        target,
        grams: gd.gramsWhenMissing,
        gramsSource: "when_missing",
        precedence: 60,
      });
    }
  }

  // ---- decisions.ingredients[]
  type DecEntry = any;
  const allDecisions: DecEntry[] = (decisions as any)?.ingredients ?? [];

  // excluded (F1A, precedence 20) — все exact executable записи
  for (const ing of allDecisions) {
    if (ing?.action !== "excluded") continue;
    const key = normalizeBookIngredientName(cleanName(ing.sourceName));
    if (!key) {
      deferred.push({ source: ing.sourceName, action: "excluded", reason: "empty_normalized_key" });
      continue;
    }
    register({
      ruleId: `dec_excluded:${key}`,
      action: "excluded",
      normalizedKey: key,
      reason: typeof ing.reason === "string" ? ing.reason : "excluded",
      precedence: 20,
    });
  }

  // foodKey — только одобренный F1B-safe subset ×4
  const F1B_SAFE = new Set(
    ["кешью-соус", "яблочный джем без сахара", "жёлтый горох колотый", "паста из тыквенных семечек"].map((s) =>
      normalizeBookIngredientName(cleanName(s))
    )
  );
  for (const ing of allDecisions) {
    if (ing?.action !== "foodKey") continue;
    const key = normalizeBookIngredientName(cleanName(ing.sourceName));
    if (!F1B_SAFE.has(key)) {
      deferred.push({
        source: ing.sourceName,
        action: "foodKey",
        reason: ing.recipeId ? "f1b_defer: recipeId scoping" : "f1b_defer: components/ratio semantics or no gram source",
      });
      continue;
    }
    if (ing.recipeId) fail(`foodKey safe entry "${ing.sourceName}" unexpectedly carries recipeId`);
    if ("components" in ing || "ratio" in ing || "whenOnePiece" in ing) {
      fail(`foodKey safe entry "${ing.sourceName}" unexpectedly carries composite fields`);
    }
    const target = resolveGreen(ing.foodKey);
    greenChecks++;
    const rule: CompiledRule = {
      ruleId: `dec_food_key:${key}`,
      action: "food_key",
      normalizedKey: key,
      target,
      precedence: 30,
    };
    if (typeof ing.grams === "number") {
      rule.grams = ing.grams;
      rule.gramsSource = "fixed";
    } else if (typeof ing.gramsWhenMissing === "number") {
      rule.grams = ing.gramsWhenMissing;
      rule.gramsSource = "when_missing";
    }
    register(rule);
  }

  // split (F2S1) — exact sourceName + recipeId allowlist, синхронизирован с
  // F2S1_APPROVED_SPLITS в src/utils/bookRecipeNutrients.ts. Один compiled
  // rule на пару (sourceName, recipeId); применение только при точном scope.
  // «зелень», «растительное молоко», «тмин + кориандр», «орегано, тмин» и
  // recipe_day_7 для укроп/петрушки — вне allowlist → deferred.
  const F2S1_APPROVED_SPLITS: ReadonlyArray<{ sourceName: string; recipeIds: readonly string[] }> = [
    { sourceName: "укроп, петрушка", recipeIds: ["lunch_2", "compliment_7"] },
    { sourceName: "микс зелени", recipeIds: ["dinner_20"] },
    { sourceName: "укроп, петрушка, руккола", recipeIds: ["lunch_5"] },
    { sourceName: "укроп + мята", recipeIds: ["recipe_day_39"] },
    { sourceName: "красный и жёлтый перец", recipeIds: ["breakfast_25"] },
    { sourceName: "семена подсолнечника, тыквы, кунжута", recipeIds: ["dinner_2"] },
    { sourceName: "смесь семян (тыква, кунжут, амарант, чёрный тмин, расторопша)", recipeIds: ["must_have_8"] },
    { sourceName: "свежие или замороженные ягоды", recipeIds: ["compliment_1", "breakfast_3"] },
    { sourceName: "ягоды", recipeIds: ["breakfast_11", "breakfast_18", "recipe_day_13", "recipe_day_14", "recipe_day_19"] },
    { sourceName: "смесь кунжута и дроблёных грецких орехов", recipeIds: ["breakfast_13"] },
    // F2S2-berry coverage (approved): точные recipe-scoped словоформы
    { sourceName: "замороженные ягоды", recipeIds: ["recipe_day_23"] },
    { sourceName: "замороженные/свежие ягоды", recipeIds: ["breakfast_14"] },
    { sourceName: "свежие/замороженные ягоды", recipeIds: ["breakfast_16"] },
    { sourceName: "ягоды свежие или замороженные", recipeIds: ["breakfast_4"] },
  ];
  const approvedNormKeys = new Set(F2S1_APPROVED_SPLITS.map((a) => normalizeBookIngredientName(cleanName(a.sourceName))));
  for (const approved of F2S1_APPROVED_SPLITS) {
    const key = normalizeBookIngredientName(cleanName(approved.sourceName));
    for (const rid of approved.recipeIds) {
      if (!recipeIds.has(rid)) fail(`split "${approved.sourceName}": invalid recipeId ${rid}`);
    }
    const ing = allDecisions.find(
      (i) => i?.action === "split" && normalizeBookIngredientName(cleanName(i.sourceName ?? "")) === key
    );
    if (!ing || !Array.isArray(ing.components)) fail(`split "${approved.sourceName}": decision entry missing`);
    const components: CompiledComponent[] = [];
    let ratioSum = 0;
    let hasRatio = false;
    for (const c of ing.components) {
      if (!c || typeof c.foodKey !== "string") continue;
      const target = resolveGreen(c.foodKey);
      greenChecks++;
      if (typeof c.ratio === "number") {
        hasRatio = true;
        ratioSum += c.ratio;
        components.push({ ...target, ratio: c.ratio });
      } else if (typeof c.grams === "number") {
        components.push({ ...target, grams: c.grams });
      }
    }
    if (hasRatio && Math.abs(ratioSum - 1) > 1e-6) {
      fail(`split "${ing.sourceName}": ratio sum ${ratioSum} != 1 ±1e-6`);
    }
    ratioSumChecks++;
    const base: CompiledRule = {
      ruleId: "",
      action: "split",
      normalizedKey: key,
      components,
      precedence: 40,
    };
    if (Array.isArray(ing.perHandful)) {
      const gramsOut: Array<{ resolvedNameRu: string; grams: number }> = [];
      for (const p of ing.perHandful) {
        if (!p || typeof p.foodKey !== "string" || typeof p.grams !== "number") continue;
        const t = resolveGreen(p.foodKey);
        greenChecks++;
        gramsOut.push({ resolvedNameRu: t.resolvedNameRu, grams: p.grams });
      }
      canonicalAmountChecks++;
      base.amountOverrides = [{ matchPieceKey: pieceAmountKey("1 горсть"), grams: gramsOut }];
    }
    for (const rid of approved.recipeIds) {
      register({ ...base, ruleId: `dec_split:${key}@${rid}`, recipeId: rid });
    }
  }
  // все остальные split-записи decisions — deferred
  for (const ing of allDecisions) {
    if (ing?.action !== "split") continue;
    const key = normalizeBookIngredientName(cleanName(ing.sourceName ?? ""));
    if (!approvedNormKeys.has(key)) {
      deferred.push({
        source: ing.sourceName,
        action: "split",
        reason: "not in approved F2S1 scope (key collision or no approved recipeId)",
      });
    }
  }

  // ---- each-splits (approved): масса КАЖДОГО компонента
  const EACH_APPROVED: ReadonlyArray<{ sourceName: string; recipeId: string }> = [
    { sourceName: "тмин + кориандр", recipeId: "compliment_13" },
    { sourceName: "орегано, тмин", recipeId: "lunch_15" },
    { sourceName: "укроп, петрушка", recipeId: "recipe_day_7" },
  ];
  for (const a of EACH_APPROVED) {
    const key = normalizeBookIngredientName(cleanName(a.sourceName));
    if (!recipeIds.has(a.recipeId)) fail(`each-split "${a.sourceName}": invalid recipeId ${a.recipeId}`);
    const ing = allDecisions.find(
      (i) => i?.action === "split" && normalizeBookIngredientName(cleanName(i.sourceName ?? "")) === key
    );
    if (!ing || typeof ing.eachMatchPieceKey !== "string" || !Array.isArray(ing.eachGrams)) {
      fail(`each-split "${a.sourceName}": decision entry missing eachGrams/eachMatchPieceKey`);
    }
    const components: CompiledComponent[] = [];
    for (const c of ing.eachGrams) {
      if (!c || typeof c.foodKey !== "string" || typeof c.grams !== "number") continue;
      const target = resolveGreen(c.foodKey);
      greenChecks++;
      components.push({ ...target, grams: c.grams });
    }
    canonicalAmountChecks++;
    register({
      ruleId: `dec_split_each:${key}@${a.recipeId}`,
      action: "split_each",
      normalizedKey: key,
      recipeId: a.recipeId,
      amountMatcher: { kind: "piece_key", value: ing.eachMatchPieceKey },
      components,
      precedence: 35,
    });
  }

  // всё остальное из decisions.ingredients → deferred manifest
  const deferredSeen = new Set(deferred.map((d) => `${d.source}|${d.action}`));
  for (const ing of allDecisions) {
    if (!ing || typeof ing.action !== "string") continue;
    const key = typeof ing.sourceName === "string" ? normalizeBookIngredientName(cleanName(ing.sourceName)) : "";
    const isIncluded =
      (ing.action === "excluded" && key && decKeysHas(rules, key, "excluded")) ||
      (ing.action === "foodKey" && F1B_SAFE.has(key)) ||
      (ing.action === "split" && key && decKeysHas(rules, key, "split")) ||
      (ing.action === "split" && key && decKeysHas(rules, key, "split_each"));
    if (isIncluded) continue;
    const dedupKey = `${ing.sourceName ?? "(unknown)"}|${ing.action}`;
    if (deferredSeen.has(dedupKey)) continue;
    deferredSeen.add(dedupKey);
    const reason =
      ing.action === "split_scaled"
        ? "unsupported_composite_scaling"
        : ing.action === "use_recipe_source"
          ? "recipe_reference"
          : String(ing.action).startsWith("recipe_")
            ? "unsupported_recipe_computation"
            : ing.action === "excluded"
              ? "not_exact_key_match_on_existing_lines"
              : "f1b_defer_or_unsupported_action";
    deferred.push({ source: ing.sourceName ?? "(unknown)", action: ing.action, reason });
  }
  function decKeysHas(rs: CompiledRule[], key: string, action: string): boolean {
    return rs.some((r) => r.action === action && r.normalizedKey === key);
  }

  // ---- recipe-specific overrides (precedence 10, recipeScoped)
  // Источник: BOOK_RECIPE_LINE_PRIMARY / BOOK_RECIPE_LEADING_OR /
  // BOOK_RECIPE_SPECIFIC_MAPPINGS в src/utils/bookRecipeNutrients.ts
  // (значения продублированы здесь сознательно: константы не экспортированы).
  register({
    ruleId: "override:compliment_11:imbir_primary_line",
    action: "line_override",
    normalizedKey:
      "compliment_11::свежий натертый имбирь - 1 ст. л. Если используете чеснок, тогда - 5 зубчиков целиком. Можно заменить асафетидой;",
    recipeId: "compliment_11",
    amountMatcher: { kind: "exact_line", value: "свежий натертый имбирь - 1 ст. л." },
    replacementLine: "свежий натертый имбирь - 1 ст. л.",
    precedence: 10,
  });
  register({
    ruleId: "override:recipe_day_29:strip_leading_ili",
    action: "line_override",
    normalizedKey: "leading_или",
    recipeId: "recipe_day_29",
    transform: "strip_leading_ili",
    precedence: 10,
  });
  {
    const target = index.get(normalize("Лимон свеж. сок"));
    if (!target || target.wfpbStatus !== "green") fail('specific mapping target "Лимон свеж. сок" not green');
    greenChecks++;
    register({
      ruleId: "override:compliment_1:limonnogo",
      action: "alias",
      normalizedKey: normalizeBookIngredientName(cleanName("лимонного")),
      recipeId: "compliment_1",
      target: { foodKey: normalize("Лимон свеж. сок"), resolvedNameRu: target.nameRu, wfpbStatus: "green" },
      precedence: 10,
    });
  }

  // ---- structuredIngredients из back-data (recipeScoped, precedence 30)
  let structuredCount = 0;
  for (const s of BACK_SOURCES) {
    for (const e of s) {
      if (!recipeIds.has(e.id)) fail(`back-data id "${e.id}" unknown`);
      for (const si of e.structuredIngredients ?? []) {
        if (!si.originalName || !si.foodKey) fail(`structuredIngredients in ${e.id}: missing originalName/foodKey`);
        const target = resolveGreen(si.foodKey);
        greenChecks++;
        structuredCount++;
        const rule: CompiledRule = {
          ruleId: `structured:${e.id}:${normalizeBookIngredientName(cleanName(si.originalName))}`,
          action: "structured",
          normalizedKey: normalizeBookIngredientName(cleanName(si.originalName)),
          recipeId: e.id,
          target,
          precedence: 30,
        };
        if (typeof si.grams === "number") {
          rule.grams = si.grams;
          rule.gramsSource = "fixed";
        }
        register(rule);
      }
    }
  }

  // ---- outputs
  const sorted = [...rules].sort(
    (a, b) => a.precedence - b.precedence || a.action.localeCompare(b.action) || a.ruleId.localeCompare(b.ruleId)
  );
  const globalRules = sorted.filter((r) => !r.recipeId);
  const recipeScoped: Record<string, CompiledRule[]> = {};
  for (const r of sorted) {
    if (!r.recipeId) continue;
    (recipeScoped[r.recipeId] ??= []).push(r);
  }

  const registry = {
    version: 1,
    generatedAt: new Date().toISOString(),
    inputs: {
      decisionsSha256: sha256(JSON.stringify(decisions)),
      synonymsSha256: sha256(JSON.stringify(BOOK_SYNONYMS)),
      backDataSha256: sha256(JSON.stringify(BACK_SOURCES.map((s) => s.map((e) => [e.id, e.ingredients, e.structuredIngredients ?? null])))),
      foodItemIndexSize: index.size,
    },
    globalRules,
    recipeScoped,
  };

  const byAction: Record<string, number> = {};
  for (const r of sorted) byAction[r.action] = (byAction[r.action] ?? 0) + 1;

  const uniqueTargets = new Set<string>();
  for (const r of sorted) {
    if (r.target) uniqueTargets.add(r.target.resolvedNameRu);
    for (const c of r.components ?? []) uniqueTargets.add(c.resolvedNameRu);
    for (const o of r.amountOverrides ?? []) for (const g of o.grams) uniqueTargets.add(g.resolvedNameRu);
  }

  const report = {
    version: 1,
    generatedAt: registry.generatedAt,
    inputs: registry.inputs,
    counts: {
      totalRules: sorted.length,
      byAction,
      deferred: deferred.length,
      uniqueFoodItemTargets: uniqueTargets.size,
      validations: {
        greenTargetChecks: greenChecks,
        canonicalAmountChecks: canonicalAmountChecks,
        ratioSumChecks: ratioSumChecks,
        duplicateKeyChecks: duplicateChecks,
      },
      structuredIngredientsCompiled: structuredCount,
    },
    includedRuleIds: sorted.map((r) => r.ruleId),
    deferredManifest: deferred.sort((a, b) => a.source.localeCompare(b.source)),
    sourceOnlyNote:
      "Deferred entries remain in book-ingredient-decisions.json as source-of-truth and MUST NOT be added to runtime registry without a new approved product decision.",
  };

  writeFileSync(path.join(OUT_DIR, "book-registry.json"), JSON.stringify(registry, null, 2) + "\n");
  writeFileSync(path.join(OUT_DIR, "book-registry.report.json"), JSON.stringify(report, null, 2) + "\n");

  console.log(`rules=${sorted.length} (global=${globalRules.length}, recipeScoped=${sorted.length - globalRules.length})`);
  console.log("counts.byAction:", JSON.stringify(byAction));
  console.log(`deferred=${deferred.length} uniqueFoodItemTargets=${uniqueTargets.size}`);
  console.log("validations:", JSON.stringify(report.counts.validations));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("[build-book-registry] Fatal:", err instanceof Error ? err.message : err);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
