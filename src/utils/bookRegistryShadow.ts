/**
 * Book registry SHADOW path (F-shadow).
 *
 * Compiled registry (output/book-registry.json) исполняется ПАРАЛЛЕЛЬНО
 * production resolver'у. Legacy результат остаётся authoritative: shadow
 * никогда не меняет returned result и не бросает ошибок наружу.
 *
 * Контракт:
 *  - runBookRegistryShadowCompare() планирует асинхронное сравнение;
 *  - правила вне registry (P2/seasoning/water/direct-name fallback) берут
 *    actual legacy запись как источник (legacy source of truth);
 *  - diff логируется с recipe key, raw line, old/compiled result и ruleId;
 *  - bookRegistryShadowStats.{runs,diffs} — счётчики для тестов;
 *  - await flushBookRegistryShadow() в тестах перед проверкой счётчиков.
 */
import registryJson from "../../output/book-registry.json";
import { MISO_VARIANTS } from "./bookRecipeNutrients";
import { normalize } from "./ingredientMappingCore";
import { prisma } from "../prisma";

const FILLER_PREFIX = /^(немного|чуть|примерно|около|по)\s+/;
const AMT_FRACTIONS: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 0.33, "⅔": 0.67, "⅛": 0.125,
};

function cleanNameLocal(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\*/g, " ")
    .replace(/[.,;]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}
function normalizeBIN(name: string): string {
  const lower = normalize(name);
  const noPunct = lower
    .replace(/[()[\]{}«»"',.;:!?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return noPunct.split(/\s+/).filter((w) => !["большой","большая","большое","большие","крупный","крупная","крупное","крупные","средний","средняя","среднее","средние","сухой","сухая","сухое","сухие","очищенный","очищенная","очищенное","очищенные","нарезанный","нарезанная","нарезанное","нарезанные","кубиками","черешок"].includes(w)).join(" ");
}
function pieceAmountKeyLocal(amount: string): string {
  return normalize(amount)
    .replace(/[.,;:!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
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
function splitAmountLocal(line: string): { name: string; amount: string } | null {
  const re = /\s+[-–—]\s+/g;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  let depth = 0;
  let scanIdx = 0;
  while ((m = re.exec(line)) !== null) {
    for (; scanIdx < m.index; scanIdx++) {
      if (line[scanIdx] === "(") depth++;
      else if (line[scanIdx] === ")" && depth > 0) depth--;
    }
    if (depth === 0) last = m;
  }
  if (!last) return null;
  return {
    name: line.slice(0, last.index).trim(),
    amount: line.slice(last.index + last[0].length).trim(),
  };
}
function isWaterLocal(name: string): boolean {
  const n = normalize(name);
  return /^вода(\s|$)/.test(n) || n.indexOf("кипяток") !== -1 || n === "горячая вода";
}

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

export interface ShadowActualItem {
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

export const bookRegistryShadowStats = { runs: 0, diffs: 0 };

const pending: Array<Promise<void>> = [];
export function flushBookRegistryShadow(): Promise<void> {
  return Promise.all(pending).then(() => {});
}

let indexPromise: Promise<Map<string, { nameRu: string; wfpbStatus: string }>> | null = null;
function loadIndex(): Promise<Map<string, { nameRu: string; wfpbStatus: string }>> {
  indexPromise ??= prisma.foodItem
    .findMany({ select: { nameRu: true, wfpbStatus: true } })
    .then((items) => {
      const map = new Map<string, { nameRu: string; wfpbStatus: string }>();
      for (const it of items) {
        const k = normalize(it.nameRu);
        if (k && !map.has(k)) map.set(k, { nameRu: it.nameRu, wfpbStatus: it.wfpbStatus });
      }
      return map;
    });
  return indexPromise;
}

const globalRules = ((registryJson as any).globalRules ?? []) as CompiledRule[];
const recipeScoped = ((registryJson as any).recipeScoped ?? {}) as Record<string, CompiledRule[]>;
const byAction = (action: string, key: string, recipeId?: string): CompiledRule[] =>
  globalRules.filter((r) => r.action === action && r.normalizedKey === key && !r.recipeId).concat(
    recipeId ? (recipeScoped[recipeId] ?? []).filter((r) => r.action === action && r.normalizedKey === key) : []
  );

export interface CompiledDiff { msg: string; rawLine?: string; ruleId?: string }
export interface CompiledResult {
  items: ShadowActualItem[];
  status: "complete" | "partial";
  partialReasons: string[];
  diffs: CompiledDiff[];
}

/** Синхронный compiled-интерпретатор registry (primary path для BOOK_REGISTRY_RUNTIME=1). */
export function computeCompiledResult<T extends ShadowActualItem>(
  recipeId: string,
  ingredients: string[],
  structuredIngredients: any[],
  actual: { status: string; partialReasons: string[]; ingredients: T[] },
  index: Map<string, { nameRu: string; wfpbStatus: string }>
): CompiledResult & { items: T[] } {
  const isGreen = (nameRu: string) => index.get(normalize(nameRu))?.wfpbStatus === "green";
    const resolveViaRegistry = (norm: string, rid: string): string | null => {
      const scoped = rid ? (recipeScoped[rid] ?? []).find((r) => r.action === "alias" && r.normalizedKey === norm) : undefined;
      if (scoped?.target) return scoped.target.resolvedNameRu;
      const rec = index.get(norm);
      if (rec) return rec.nameRu;
      const alias = globalRules.find((r) => r.action === "alias" && r.normalizedKey === norm);
      return alias?.target?.resolvedNameRu ?? null;
    };
    const itemEquals = (a: ShadowActualItem, b: ShadowActualItem): string | null => {
      for (const f of [
        "rawName", "normalizedName", "grams", "excluded",
        "excludedReason", "excludedRuleId", "foodItemNameRu", "gramDefaultRuleId", "unresolvedReason",
      ] as const) {
        if (a[f] !== b[f]) return `${f}: actual=${JSON.stringify(a[f])} compiled=${JSON.stringify(b[f])}`;
      }
      return null;
    };

    const compiledItems: ShadowActualItem[] = [];
    let oldIdx = 0;
    const takeOld = (count: number): ShadowActualItem[] => {
      const out = actual.ingredients.slice(oldIdx, oldIdx + count);
      oldIdx += count;
      return out;
    };
    for (const line of ingredients) {
      let line0 = line;
      const scopedRules = recipeScoped[recipeId] ?? [];
      const hasIliTransform = scopedRules.some((r) => r.transform === "strip_leading_ili");
      for (const r of scopedRules) {
        if (r.action !== "line_override") continue;
        if (r.amountMatcher?.kind === "exact_line" && line === r.normalizedKey.split("::").slice(1).join("::")) {
          line0 = r.replacementLine ?? line;
        }
      }
      const sp = splitAmountLocal(line0);
      if (!sp) continue;
      const clean0 = cleanNameLocal(sp.name);
      if (!clean0) continue;
      const clean = hasIliTransform ? clean0.replace(/^или\s+/i, "") : clean0;
      const options = clean.split(/\s+(?:или)\s+|\//g).map((p) => p.trim()).filter(Boolean);
      if (options.some((o) => isWaterLocal(o))) {
        compiledItems.push({
          rawName: sp.name, normalizedName: clean, grams: parseGramsLocal(sp.amount), excluded: true,
        });
        takeOld(1);
        continue;
      }
      const candidate = options.length > 1 ? options[0].replace(FILLER_PREFIX, "") : clean;
      const hasAlternatives = options.length > 1;
      const grams = parseGramsLocal(sp.amount);
      const key = normalizeBIN(clean);
      const norm = normalizeBIN(candidate);

      const exc = byAction("excluded", key).find((r) => !r.recipeId);
      if (exc) {
        compiledItems.push({
          rawName: sp.name, normalizedName: candidate, grams: null, excluded: true, excludedReason: exc.reason,
        });
        takeOld(1);
        continue;
      }
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
      const decEach = byAction("split_each", key, recipeId).find((r) => r.recipeId === recipeId);
      if (decEach && decEach.amountMatcher?.kind === "piece_key" && decEach.amountMatcher.value === pieceAmountKeyLocal(sp.amount)) {
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

      const decSplit = byAction("split", key, recipeId).find((r) => r.recipeId === recipeId);
      if (decSplit) {
        let handout: Array<{ nameRu: string; grams: number }> | null = null;
        if (grams != null) {
          const comps = decSplit.components ?? [];
          const ratioSum = comps.reduce((acc, c) => acc + (c.ratio ?? 0), 0);
          const hasRatio = comps.some((c) => typeof c.ratio === "number");
          if (!hasRatio || Math.abs(ratioSum - 1) < 1e-6) {
            handout = comps.map((c) => ({
              nameRu: c.resolvedNameRu,
              grams: typeof c.grams === "number" ? c.grams : grams * (c.ratio ?? 0),
            }));
          }
        } else {
          const ov = decSplit.amountOverrides?.find((o) => o.matchPieceKey === pieceAmountKeyLocal(sp.amount));
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
      }

      if (grams == null) {
        const nextOld = actual.ingredients[oldIdx];
        if (nextOld?.excluded === true) {
          compiledItems.push(...takeOld(1));
          continue;
        }
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
          const matched = resolveViaRegistry(norm, recipeId);
          if (matched && isGreen(matched)) {
            compiledItems.push({
              rawName: sp.name, normalizedName: candidate, grams: rule.grams ?? null,
              excluded: false, foodItemNameRu: matched, gramDefaultRuleId: rule.ruleId,
            });
            takeOld(1);
            continue;
          }
        }
        if (rule == null && !hasAlternatives) {
          const pieceRule = byAction("piece_default", norm).find(
            (r) => r.amountMatcher?.kind === "piece_key" && r.amountMatcher.value === pieceAmountKeyLocal(sp.amount)
          );
          const pieceOk =
            pieceRule != null && !sp.amount.includes("+") &&
            !/на кончике ножа|по вкусу|опционально/.test(sp.amount);
          if (pieceOk && pieceRule) {
            const matched = resolveViaRegistry(norm, recipeId);
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
        compiledItems.push(...takeOld(1));
        continue;
      }

      // grams != null
      const siRule = (recipeScoped[recipeId] ?? []).find(
        (r) => r.action === "structured" && r.normalizedKey === normalizeBIN(clean0)
      );
      const specRule = (recipeScoped[recipeId] ?? []).find((r) => r.action === "alias" && r.normalizedKey === norm);
      const matched = siRule?.target
        ? resolveViaRegistry(normalize(siRule.target.foodKey), recipeId)
        : specRule?.target
          ? resolveViaRegistry(normalize(specRule.target.foodKey), recipeId)
          : resolveViaRegistry(norm, recipeId);
      if (matched && isGreen(matched)) {
        compiledItems.push({
          rawName: sp.name, normalizedName: candidate, grams, excluded: false, foodItemNameRu: matched,
        });
        takeOld(1);
      } else {
        compiledItems.push(...takeOld(1));
      }
    }

    // сравнение
    const diffs: CompiledDiff[] = [];
    const pushDiff = (msg: string, rawLine?: string, ruleId?: string) => diffs.push({ msg, rawLine, ruleId });
    if (compiledItems.length !== actual.ingredients.length) {
      pushDiff(`item count actual=${actual.ingredients.length} compiled=${compiledItems.length}`);
    }
    const nCmp = Math.min(compiledItems.length, actual.ingredients.length);
    for (let i = 0; i < nCmp; i++) {
      const d = itemEquals(actual.ingredients[i], compiledItems[i]);
      if (d) {
        pushDiff(
          `[${i}] ${d}`,
          actual.ingredients[i].rawName,
          compiledItems[i].gramDefaultRuleId ?? compiledItems[i].excludedRuleId
        );
      }
    }
    const compiledReasons = [...new Set(compiledItems.map((i) => i.unresolvedReason).filter(Boolean))] as string[];
    const compiledStatus: "complete" | "partial" = compiledReasons.length === 0 ? "complete" : "partial";
    if (actual.status !== compiledStatus) pushDiff(`status actual=${actual.status} compiled=${compiledStatus}`);
    if (JSON.stringify(actual.partialReasons) !== JSON.stringify(compiledReasons)) {
      pushDiff(`partialReasons actual=${JSON.stringify(actual.partialReasons)} compiled=${JSON.stringify(compiledReasons)}`);
    }
    // Deep-equal проверен выше; форма элементов идентична T (ShadowActualItem-подмножество).
    return { items: compiledItems as T[], status: compiledStatus, partialReasons: compiledReasons, diffs };
}

/** Shadow-режим (BOOK_REGISTRY_RUNTIME=0 или unset): асинхронное сравнение, legacy authoritative. */
export function scheduleBookRegistryShadow(
  recipeId: string,
  ingredients: string[],
  structuredIngredients: any[],
  actual: { status: string; partialReasons: string[]; ingredients: ShadowActualItem[] }
): void {
  if (process.env.BOOK_REGISTRY_SHADOW === "0") return;
  const task = (async () => {
    const index = await loadIndex();
    const c = computeCompiledResult(recipeId, ingredients, structuredIngredients, actual, index);
    bookRegistryShadowStats.runs++;
    if (c.diffs.length) {
      bookRegistryShadowStats.diffs++;
      console.warn(`[BookRegistryShadow] DIFF ${recipeId} (${c.diffs.length}):`);
      for (const d of c.diffs.slice(0, 20)) console.warn(`  ${d.msg}`);
    }
  })().catch((err) => {
    console.warn(`[BookRegistryShadow] ${recipeId}: shadow error suppressed:`, err instanceof Error ? err.message : err);
  });
  pending.push(task.then(() => {
    const i = pending.indexOf(task);
    if (i >= 0) pending.splice(i, 1);
  }));
}

export const bookRegistryRuntimeStats = { runs: 0, fallbacks: 0 };

/**
 * RUNTIME=1: compiled registry — primary resolver. При ЛЮБОМ расхождении
 * registry vs legacy registry-результат отбрасывается (fallback на legacy),
 * diagnostic пишется с recipe key, raw line и ruleId.
 */
export function applyRegistryRuntime<T extends ShadowActualItem>(
  recipeId: string,
  ingredients: string[],
  structuredIngredients: any[],
  actual: { status: string; partialReasons: string[]; ingredients: T[] },
  index: Map<string, { nameRu: string; wfpbStatus: string }>
): T[] {
  bookRegistryRuntimeStats.runs++;
  const c = computeCompiledResult(recipeId, ingredients, structuredIngredients, actual, index);
  if (c.diffs.length === 0) return c.items;
  bookRegistryRuntimeStats.fallbacks++;
  for (const d of c.diffs.slice(0, 20)) {
    console.warn(
      `[BookRegistryRuntime] DIFF recipe=${recipeId} | line=${JSON.stringify(d.rawLine ?? "")} | rule=${d.ruleId ?? "-"} | ${d.msg}`
    );
  }
  return actual.ingredients;
}

function parseGramsLocal(amount: string): number | null {
  const n = amount.replace(/,/g, ".");
  const boundary = "(?=[\\s;.,)\\-»]|$)";
  const g = n.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*гр?\\.?${boundary}`));
  if (g) return parseFloat(g[1]);
  const ml = n.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*мл${boundary}`));
  if (ml) return parseFloat(ml[1]);
  const l = n.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*л${boundary}`));
  if (l) return parseFloat(l[1]) * 1000;
  return null;
}
