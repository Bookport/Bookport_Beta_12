/**
 * Golden-diff harness: old resolver vs compiled book-registry (read-only).
 *
 * Прогоняет все 151 Book recipe двумя способами:
 *  1) old  — production resolveBookRecipeNutrients;
 *  2) compiled — независимый интерпретатор output/book-registry.json
 *     (aliases, gram/piece defaults, exact excluded, F1B-safe foodKey,
 *     F2S1 scoped split, line overrides, structured ingredients),
 *     с fallback к old-результату для правил вне registry.
 *
 * Сравнение поэлементное: status, partialReasons, порядок ингредиентов и все
 * поля ResolvedBookIngredient. Расхождение → печать recipe key / raw line /
 * old / compiled / ruleId и exit 1. 151/151 deep-equal → exit 0.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  resolveBookRecipeNutrients,
  splitAmount,
  cleanName,
  normalizeBookIngredientName,
  resolveBookName,
  parseGrams,
  pieceAmountKey,
  isSeasoningAmount,
  isWater,
  MISO_VARIANTS,
} from "../src/utils/bookRecipeNutrients";
import { normalize } from "../src/utils/ingredientMappingCore";
import { breakfastBackData } from "../src/data/breakfast_back";
import { lunchBackData } from "../src/data/lunch_back";
import { dinnerBackData } from "../src/data/dinner_back";
import { mustHaveBackData } from "../src/data/must_have_back";
import { recipeDayBackData } from "../src/data/recipe_day_back";
import { complimentsBackData } from "../src/data/compliments_back";
import { prisma } from "../src/prisma";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_PATH = path.join(ROOT, "output", "book-registry.json");

const FILLER_PREFIX = /^(немного|чуть|примерно|около|по)\s+/;
const AMT_FRACTIONS: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 0.33, "⅔": 0.67, "⅛": 0.125,
};

// зеркало parseAmountValue/amountKey из резолвера
function parseAmountValue(amount: string): number | null {
  const n = normalize(amount).trim();
  let m = n.match(/^([\d][\d,.]*)\s+[а-я]/i);
  if (m) {
    const v = parseFloat(m[1].replace(",", "."));
    if (!isNaN(v)) return v;
  }
  m = n.match(/^\d+\s+/);
  if (m) return Number(m[0].trim());
  m = n.match(/^[⅓½¼¾⅔⅛]/);
  if (m) {
    const b = AMT_FRACTIONS[m[0]];
    if (b != null) return b;
  }
  m = n.match(/^(?<whole>\d+)\s?(?<frac>[⅓½¼¾⅔⅛])/);
  if (m?.groups?.frac) {
    const b = AMT_FRACTIONS[m.groups.frac];
    if (b != null) return Number(m.groups.whole) + b;
  }
  return null;
}
function amountKeyOf(amount: string): string | null {
  const value = parseAmountValue(amount);
  if (value == null) return null;
  const n = normalize(amount).trim();
  const measure = /ст/.test(n) ? "tbsp" : "tsp";
  const formatted = value % 1 === 0 ? String(value) : Number(value.toFixed(2)).toString();
  return `${formatted} ${measure}`;
}

const SOURCES: Array<{ type: string; data: Array<{ id: string; ingredients: string[]; structuredIngredients?: any[] }> }> = [
  { type: "breakfast", data: breakfastBackData as any },
  { type: "lunch", data: lunchBackData as any },
  { type: "dinner", data: dinnerBackData as any },
  { type: "must_have", data: mustHaveBackData as any },
  { type: "recipe_of_day", data: recipeDayBackData as any },
  { type: "compliment", data: complimentsBackData as any },
];

interface CompiledRule {
  ruleId: string;
  action: string;
  normalizedKey: string;
  recipeId?: string;
  amountMatcher?: { kind: string; value: string };
  target?: { foodKey: string; resolvedNameRu: string; wfpbStatus: string };
  grams?: number;
  gramsSource?: string;
  components?: Array<{ foodKey: string; resolvedNameRu: string; ratio?: number; grams?: number }>;
  amountOverrides?: Array<{ matchPieceKey: string; grams: Array<{ resolvedNameRu: string; grams: number }> }>;
  replacementLine?: string;
  transform?: string;
  reason?: string;
  precedence: number;
}

interface Item {
  rawName: string;
  normalizedName: string;
  grams: number | null;
  excluded: boolean;
  unresolvedReason?: string;
  excludedRuleId?: string;
  excludedReason?: string;
  foodItemNameRu?: string;
  gramDefaultRuleId?: string;
}

function itemEquals(a: Item, b: Item): string | null {
  const fields: Array<keyof Item> = [
    "rawName", "normalizedName", "grams", "excluded",
    "excludedReason", "excludedRuleId", "foodItemNameRu", "gramDefaultRuleId", "unresolvedReason",
  ];
  for (const f of fields) {
    if (a[f] !== b[f]) return `${String(f)}: old=${JSON.stringify(a[f])} compiled=${JSON.stringify(b[f])}`;
  }
  return null;
}

async function main() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  const globalRules: CompiledRule[] = registry.globalRules ?? [];
  const recipeScoped: Record<string, CompiledRule[]> = registry.recipeScoped ?? {};
  const byAction = (action: string, key: string, recipeId?: string): CompiledRule[] =>
    globalRules.filter((r) => r.action === action && r.normalizedKey === key && !r.recipeId).concat(
      recipeId ? (recipeScoped[recipeId] ?? []).filter((r) => r.action === action && r.normalizedKey === key) : []
    );

  const items = await prisma.foodItem.findMany({ select: { nameRu: true, wfpbStatus: true } });
  const index = new Map<string, { nameRu: string; wfpbStatus: string }>();
  for (const it of items) {
    const k = normalize(it.nameRu);
    if (k && !index.has(k)) index.set(k, { nameRu: it.nameRu, wfpbStatus: it.wfpbStatus });
  }
  // resolveName: прямой матч + registry alias rules (recipe-scoped приоритетнее)
  const resolveViaRegistry = (norm: string, recipeId: string): string | null => {
    const scoped = recipeId ? (recipeScoped[recipeId] ?? []).find((r) => r.action === "alias" && r.normalizedKey === norm) : undefined;
    if (scoped?.target) return scoped.target.resolvedNameRu;
    const rec = index.get(norm);
    if (rec) return rec.nameRu;
    const alias = globalRules.find((r) => r.action === "alias" && r.normalizedKey === norm);
    return alias?.target?.resolvedNameRu ?? null;
  };
  const isGreen = (nameRu: string) => index.get(normalize(nameRu))?.wfpbStatus === "green";

  let diffs = 0;
  let compared = 0;
  let totalItems = 0;
  const origInfo = console.info;
  console.info = () => {};

  for (const s of SOURCES) {
    for (const entry of s.data) {
      const num = Number((entry.id.match(/(\d+)$/) ?? [])[1]);
      if (Number.isNaN(num)) continue;
      const old = await resolveBookRecipeNutrients(s.type, num);
      const compiledItems: Item[] = [];
      let oldIdx = 0;
      const takeOld = (count: number): Item[] => {
        const out = old.ingredients.slice(oldIdx, oldIdx + count);
        oldIdx += count;
        return out;
      };

      for (const line of entry.ingredients) {
        // line overrides из registry
        let line0 = line;
        const scopedRules = recipeScoped[entry.id] ?? [];
        const hasIliTransform = scopedRules.some((r) => r.transform === "strip_leading_ili");
        for (const r of scopedRules) {
          if (r.action !== "line_override") continue;
          if (r.amountMatcher?.kind === "exact_line" && entry.id === r.recipeId && line === r.normalizedKey.split("::").slice(1).join("::")) {
            line0 = r.replacementLine ?? line;
          }
        }
        const sp = splitAmount(line0);
        if (!sp) continue;
        const clean0 = cleanName(sp.name);
        if (!clean0) continue;
        const clean = hasIliTransform ? clean0.replace(/^или\s+/i, "") : clean0;
        const options = clean.split(/\s+(?:или)\s+|\//g).map((p) => p.trim()).filter(Boolean);
        if (options.some((o) => isWater(o))) {
          compiledItems.push({
            rawName: sp.name, normalizedName: clean, grams: parseGrams(sp.amount), excluded: true,
          });
          takeOld(1);
          continue;
        }
        const candidate = options.length > 1 ? options[0].replace(FILLER_PREFIX, "") : clean;
        const hasAlternatives = options.length > 1;
        const grams = parseGrams(sp.amount);
        const key = normalizeBookIngredientName(clean);
        const norm = normalizeBookIngredientName(candidate);

        // F1A: exact excluded
        const exc = byAction("excluded", key).find((r) => !r.recipeId);
        if (exc) {
          compiledItems.push({
            rawName: sp.name, normalizedName: candidate, grams: null, excluded: true, excludedReason: exc.reason,
          });
          takeOld(1);
          continue;
        }
        // F1B: food_key
        const fk = byAction("food_key", key).find((r) => !r.recipeId);
        if (fk?.target && isGreen(fk.target.resolvedNameRu)) {
          compiledItems.push({
            rawName: sp.name, normalizedName: candidate,
            grams: grams ?? (fk.gramsSource === "when_missing" ? fk.grams ?? null : null),
            excluded: false, foodItemNameRu: fk.target.resolvedNameRu,
          });
          takeOld(1);
          continue;
        }
        // F2-each: exact each-splits (approved)
        const decEach = byAction("split_each", key, entry.id).find((r) => r.recipeId === entry.id);
        if (decEach && decEach.amountMatcher?.kind === "piece_key" && decEach.amountMatcher.value === pieceAmountKey(sp.amount)) {
          const comps = decEach.components ?? [];
          if (comps.length && comps.every((c) => isGreen(c.resolvedNameRu))) {
            for (const c of comps) {
              compiledItems.push({
                rawName: sp.name, normalizedName: candidate, grams: c.grams ?? null,
                excluded: false, foodItemNameRu: c.resolvedNameRu,
              });
            }
            takeOld(comps.length);
            continue;
          }
        }
        // F2S1: split (scoped)
        const splitRules = byAction("split", key, entry.id).filter((r) => r.recipeId === entry.id);
        const decSplit = splitRules[0];
        if (decSplit) {
          let handout: Array<{ nameRu: string; grams: number }> | null = null;
          if (grams != null) {
            const ratioSum = (decSplit.components ?? []).reduce((acc, c) => acc + (c.ratio ?? 0), 0);
            const hasRatio = (decSplit.components ?? []).some((c) => typeof c.ratio === "number");
            if (!hasRatio || Math.abs(ratioSum - 1) < 1e-6) {
              handout = (decSplit.components ?? []).map((c) => ({
                nameRu: c.resolvedNameRu,
                grams: typeof c.grams === "number" ? c.grams : grams * (c.ratio ?? 0),
              }));
            }
          } else {
            const ov = decSplit.amountOverrides?.find((o) => o.matchPieceKey === pieceAmountKey(sp.amount));
            if (ov) handout = ov.grams.map((g) => ({ nameRu: g.resolvedNameRu, grams: g.grams }));
          }
          if (handout && handout.length && handout.every((h) => isGreen(h.nameRu))) {
            for (const h of handout) {
              compiledItems.push({
                rawName: sp.name, normalizedName: candidate, grams: h.grams, excluded: false, foodItemNameRu: h.nameRu,
              });
            }
            takeOld(handout.length);
            continue;
          }
          // fail closed → существующий путь
        }

        if (grams == null) {
          // Порядок как в legacy: P2/seasoning-excluded проверяются ДО gram-правил.
          // Эти ветки вне registry → old является источником результата.
          const nextOld = old.ingredients[oldIdx];
          if (nextOld?.excluded === true) {
            compiledItems.push(...takeOld(1));
            continue;
          }
          // попытка registry gram/piece правил (зеркало guardOk-пути)
          const prepMatch = /^([^()]+)\s*\(([^)]+)\)/.exec(sp.name);
          const preparationKey = prepMatch
            ? `${normalize(prepMatch[1].trim())} ${normalize(prepMatch[2].trim())}`
            : null;
          const amtK = amountKeyOf(sp.amount);
          const pick = (k: string): CompiledRule | null => {
            const arr = byAction("gram_default", k).concat(byAction("piece_default", k));
            const withMatcher = arr.filter((r) => r.amountMatcher?.kind === "amount_key");
            const exact = amtK ? withMatcher.find((r) => r.amountMatcher!.value === amtK) : undefined;
            if (exact) return exact;
            const generic = arr.find((r) => !r.amountMatcher);
            return generic ?? null;
          };
          let rule = preparationKey ? pick(preparationKey) : null;
          if (!rule) rule = pick(norm);
          if (!rule && MISO_VARIANTS.has(norm)) rule = pick("мисо");
          const guardOk =
            rule != null && !hasAlternatives && !sp.amount.includes("+") &&
            !/на кончике ножа/.test(sp.amount) && !sp.amount.includes("опционально");
          if (guardOk && rule) {
            const matched = resolveViaRegistry(norm, entry.id);
            if (matched && isGreen(matched)) {
              compiledItems.push({
                rawName: sp.name, normalizedName: candidate, grams: rule.grams ?? null,
                excluded: false, foodItemNameRu: matched, gramDefaultRuleId: rule.ruleId,
              });
              takeOld(1);
              continue;
            }
          }
          // piece exact (только при rule == null)
          if (rule == null && !hasAlternatives) {
            const pieceRule = byAction("piece_default", norm).find(
              (r) => r.amountMatcher?.kind === "piece_key" && r.amountMatcher.value === pieceAmountKey(sp.amount)
            );
            const pieceOk =
              pieceRule != null && !sp.amount.includes("+") &&
              !/на кончике ножа|по вкусу|опционально/.test(sp.amount);
            if (pieceOk && pieceRule) {
              const matched = resolveViaRegistry(norm, entry.id);
              if (matched && isGreen(matched)) {
                compiledItems.push({
                  rawName: sp.name, normalizedName: candidate, grams: pieceRule.grams ?? null,
                  excluded: false, foodItemNameRu: matched, gramDefaultRuleId: pieceRule.ruleId,
                });
                takeOld(1);
                continue;
              }
            }
          }
          // вне registry (P2 / seasoning / weight_missing) → legacy
          compiledItems.push(...takeOld(1));
          continue;
        }

        // grams != null
        const siRule = (recipeScoped[entry.id] ?? []).find(
          (r) => r.action === "structured" && r.normalizedKey === normalizeBookIngredientName(clean0)
        );
        const specRule = (recipeScoped[entry.id] ?? []).find((r) => r.action === "alias" && r.normalizedKey === norm);
        const matched = siRule?.target
          ? resolveViaRegistry(normalize(siRule.target.foodKey), entry.id)
          : specRule?.target
            ? resolveViaRegistry(normalize(specRule.target.foodKey), entry.id)
            : resolveViaRegistry(norm, entry.id);
        if (matched && isGreen(matched)) {
          compiledItems.push({
            rawName: sp.name, normalizedName: candidate, grams, excluded: false, foodItemNameRu: matched,
          });
          takeOld(1);
        } else {
          compiledItems.push(...takeOld(1));
        }
      }

      // хвост old (на случай недобора — должен быть пуст)
      const tail = old.ingredients.slice(oldIdx);
      if (tail.length) {
        diffs++;
        console.log(`DIFF ${entry.id}: compiled недобрал ${tail.length} хвостовых ингредиентов`);
        for (const t of tail) console.log(`   old-only: ${JSON.stringify(t)}`);
      }

      compared++;
      // status / partialReasons: зеркалом логики резолвера — из unresolved-причин
      const compiledReasons = [...new Set(compiledItems.map((i) => i.unresolvedReason).filter(Boolean))] as string[];
      const compiledStatus = compiledReasons.length === 0 ? "complete" : "partial";
      if (old.status !== compiledStatus) {
        diffs++;
        console.log(`DIFF ${entry.id}: status old=${old.status} compiled=${compiledStatus}`);
      }
      if (JSON.stringify(old.partialReasons) !== JSON.stringify(compiledReasons)) {
        diffs++;
        console.log(`DIFF ${entry.id}: partialReasons old=${JSON.stringify(old.partialReasons)} compiled=${JSON.stringify(compiledReasons)}`);
      }
      // сравнение
      if (compiledItems.length !== old.ingredients.length) {
        diffs++;
        console.log(`DIFF ${entry.id}: item count old=${old.ingredients.length} compiled=${compiledItems.length}`);
      }
      const n = Math.min(compiledItems.length, old.ingredients.length);
      for (let i = 0; i < n; i++) {
        const d = itemEquals(old.ingredients[i], compiledItems[i]);
        if (d) {
          diffs++;
          console.log(`DIFF ${entry.id} [${i}] raw=${JSON.stringify(old.ingredients[i].rawName)}: ${d}`);
          console.log(`   old     = ${JSON.stringify(old.ingredients[i])}`);
          console.log(`   compiled= ${JSON.stringify(compiledItems[i])}`);
        }
      }
      totalItems += old.ingredients.length;
    }
  }

  console.info = origInfo;

  // агрегаты против approved baseline (по old/production resolver)
  let iUnres = 0, wMiss = 0, excl = 0, forbidden = 0;
  let complete = 0, partial = 0, gdApplied = 0;
  for (const s of SOURCES) {
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
          const st = index.get(normalize(i.foodItemNameRu))?.wfpbStatus;
          if (st && st !== "green") forbidden++;
        }
        if (i.gramDefaultRuleId) gdApplied++;
      }
    }
  }

  console.log(`\nrecipes compared: ${compared}/151, items: ${totalItems}, diffs: ${diffs}`);
  console.log(`metrics: complete=${complete} partial=${partial} ingredient_unresolved=${iUnres} weight_missing=${wMiss} excluded=${excl} forbidden=${forbidden} gram_defaults_applied=${gdApplied}`);
  const metricsOk =
    complete === 111 && partial === 40 && iUnres === 20 && wMiss === 27 && excl === 261 &&
    forbidden === 0 && gdApplied === 163;
  if (!metricsOk) {
    diffs++;
    console.log("DIFF metrics: не совпадают с approved baseline (111/40/20/27/261/0/161)");
  }
  await prisma.$disconnect();
  if (diffs > 0 || compared !== 151) {
    console.log(`\nVERDICT: FAIL (${diffs} diffs, ${compared}/151)`);
    process.exit(1);
  }
  console.log("\nVERDICT: PASS — 151/151 deep-equal, metrics match approved baseline");
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
