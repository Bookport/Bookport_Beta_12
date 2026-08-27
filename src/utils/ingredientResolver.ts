import { normalize, ALIASES } from "./ingredientMappingCore";
import {
  KEYWORD_REGISTRY,
  pickKeywordWinner,
  tokenizeKeywordInput,
} from "./ingredientKeywordMap";

// Форма записи foodCache (GET /api/food) — полная FoodItem-база, включая forbidden.
export interface StrictResolverItem {
  id: string;
  nameRu: string;
  nameEn: string;
  wfpbStatus: string;
  fdcId: number | null;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  fiber: number;
  water: number;
}

export interface StrictResolveSuccess {
  ok: true;
  foodItemId: string;
  canonicalName: string;
  wfpbStatus: "green" | "forbidden";
  nutritionComplete: boolean;
  /** Аддитивно: этап, которым распознано. Заполняет resolveIngredientWithFallback. */
  resolutionMethod?: ResolutionMethod;
}

export type StrictResolveResult = StrictResolveSuccess | { ok: false };

/** Каким этапом распознан продукт: exact name, alias или controlled keyword. */
export type ResolutionMethod = "exact" | "alias" | "keyword";

export interface StrictIndex {
  byCanonicalName: Map<string, StrictResolverItem>;
  aliasToCanonical: Map<string, string>;
}

// Полный nutrition profile: пригоден для анализа только если
// хотя бы один базовый макронутриент строго больше нуля.
export function isNutritionComplete(item: {
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
}): boolean {
  return (
    (typeof item.calories === "number" && item.calories > 0) ||
    (typeof item.protein === "number" && item.protein > 0) ||
    (typeof item.fat === "number" && item.fat > 0) ||
    (typeof item.carbohydrates === "number" && item.carbohydrates > 0)
  );
}

// Явные поддержанные синонимы: точное имя варианта -> canonical key.
// Берём ТОЛЬКО exact-варианты ingredientAliasMapper; substring-ветка
// этого модуля здесь сознательно не используется.
const EXACT_ALIAS_VARIANTS: Map<string, string> = (() => {
  const map = new Map<string, string>();
  // Варианты дублируются из ingredientAliasMapper (единственный источник правды — тот файл).
  const variantsByTarget: Record<string, string[]> = {
    "помидор": ["томаты", "томат", "черри", "помидоры"],
    "макароны": ["паста", "спагетти", "лапша", "макарон"],
    "болгарский перец": ["перец (болгарский)", "сладкий перец"],
    "овсяные хлопья": ["овсянка", "геркулес"],
    "чечевица коричневая": ["чечевичная масса", "красная чечевица", "зеленая чечевица", "чечевица"],
    "кокосовая стружка": ["кокос", "мякоть кокоса"],
    "лук репчатый": ["лук", "лук красный", "зеленый лук"],
    "агар-агар": ["желатин"],
    "кумин": ["зира"],
    "чили": ["кайенский перец", "острый перец"],
    "специи": ["смесь специй", "мускатный орех", "специя", "цедра"],
    "томатная паста": ["томатный соус", "соус", "хумус из перца"],
    "кунжут": ["семена", "семечки", "подсолнечник"],
    "мука": ["закваска", "тесто", "смесь для выпечки"],
    "вода": ["жидкость"],
    "соевый соус": ["тамари"],
    "уксус": ["уксус бальзамический", "уксус яблочный"],
    "лимон": ["лайм", "лимоны", "лимончик"],
    "капуста белокочанная": ["капуста", "капуста пекинская", "капуста краснокочанная"],
    "капуста брюссельская": ["брюссельская капуста"],
    "кабачок": ["цукини", "цуккини"],
    "морковь": ["морковка"],
    "свёкла": ["свекла"],
    "картофель": ["картошка", "картофелина", "картош", "картоф"],
    "петрушка": ["кинза"],
    "укроп": ["укропчик"],
    "чеснок": ["чесночина", "чесночный"],
    "имбирь": ["корень имбиря"],
    "куриная грудка": ["курица", "куриное филе", "куриная"],
    "стейк (сырой)": ["говядина", "свинина", "мясо", "стейк", "баранина", "телятина"],
    "лосось": ["семга", "форель", "красная рыба"],
    "рыба": ["филе рыбы", "треска", "рыбный"],
    "яйцо сырое": ["яйцо", "яйца", "куриное яйцо"],
    "молоко": ["коровье молоко", "сливки", "молочка"],
    "масло растительное": ["растительное масло", "оливковое масло", "подсолнечное масло", "масло", "кукурузное масло"],
    "сливочное масло": ["масло сливочное"],
    "сыр": ["твердый сыр", "твёрдый сыр", "плавленый сыр", "мягкий сыр", "моцарелла", "сырный"],
    "творог": ["творожок"],
    "сметана": ["сметанка"],
    "колбаса": ["колбаска", "сосиски", "сардельки"],
    "сосиски": ["сосис", "сардельк"],
    "бекон": ["бекончик"],
    "шоколад": ["шоколадка", "шоколадный"],
    "сахар": ["сахарный песок", "сахароза"],
    "соль": ["соль поваренная", "морская соль"],
    "майонез": ["майонезный соус"],
    "кетчуп": ["кетчунез"],
    "банан": ["бананы", "бананчик"],
    "яблоко": ["яблоки", "яблочко"],
    "апельсин": ["апельсины", "апельсинчик"],
    "груша": ["груши", "грушка"],
    "абрикосы": ["абрикос", "урюк"],
    "персики": ["персик", "персиковый"],
    "виноград": ["виноградинки"],
    "арбуз": ["арбузик"],
    "дыня": ["дынька"],
    // Порядок слов (same-domain, цель обязана существовать в FoodItem):
    // («растительное масло» уже покрыт записью «масло растительное» выше)
    "масло сливочное": ["сливочное масло"],
    "молоко коровье": ["коровье молоко"],
  };
  for (const [target, variants] of Object.entries(variantsByTarget)) {
    for (const v of variants) {
      const key = normalize(v);
      if (key && !map.has(key)) map.set(key, normalize(target));
    }
  }
  return map;
})();

// Строит строгие индексы по полной FoodItem-базе.
// Канонические ключи: normalized nameRu и nameEn.
// Alias-ключи: ALIASES + EXACT_ALIAS_VARIANTS; цель обязана существовать в базе,
// иначе alias не регистрируется (fail closed).
export function buildStrictIndex(foodCache: StrictResolverItem[]): StrictIndex {
  const byCanonicalName = new Map<string, StrictResolverItem>();
  const aliasToCanonical = new Map<string, string>();

  for (const item of foodCache) {
    const ru = normalize(item.nameRu || "");
    if (ru && !byCanonicalName.has(ru)) byCanonicalName.set(ru, item);
    const en = normalize(item.nameEn || "");
    if (en && !byCanonicalName.has(en)) byCanonicalName.set(en, item);
  }

  const registerAlias = (aliasKey: string, targetKey: string) => {
    if (!aliasKey || !targetKey) return;
    if (!byCanonicalName.has(targetKey)) return; // цель отсутствует в базе — не алиасим
    if (!byCanonicalName.has(aliasKey) && !aliasToCanonical.has(aliasKey)) {
      aliasToCanonical.set(aliasKey, targetKey);
    }
  };

  for (const [from, to] of Object.entries(ALIASES)) {
    registerAlias(normalize(from), normalize(to));
  }
  for (const [variant, target] of EXACT_ALIAS_VARIANTS.entries()) {
    registerAlias(variant, target);
  }

  return { byCanonicalName, aliasToCanonical };
}

// STRICT resolver: только exact canonical или exact поддержанный alias.
// Никакого fuzzy/substring/truncation/split/stemming.
export function resolveIngredientStrict(
  text: string,
  foodCache: StrictResolverItem[],
  index?: StrictIndex
): StrictResolveResult {
  const key = normalize(text || "");
  if (!key) return { ok: false };
  if (foodCache.length === 0) return { ok: false };

  const idx = index ?? buildStrictIndex(foodCache);

  let item = idx.byCanonicalName.get(key);
  if (!item) {
    const target = idx.aliasToCanonical.get(key);
    if (target) item = idx.byCanonicalName.get(target);
  }
  if (!item) return { ok: false };

  return {
    ok: true,
    foodItemId: item.id,
    canonicalName: item.nameRu,
    wfpbStatus: item.wfpbStatus === "forbidden" ? "forbidden" : "green",
    nutritionComplete: isNutritionComplete(item),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controlled keyword fallback (последний этап перед unrecognized).
// Токен-равенство по явному реестру KEYWORD_REGISTRY; без fuzzy/substring/
// candidateKeys/truncation/stemming. «Небаранина» — один токен, не совпадает
// с «баранина». Fail-closed: таргет обязан существовать в canonical index.
// ─────────────────────────────────────────────────────────────────────────────

export function resolveIngredientByKeyword(
  text: string,
  foodCache: StrictResolverItem[],
  index?: StrictIndex
): StrictResolveResult {
  const normalized = normalize(text || "");
  if (!normalized || foodCache.length === 0) return { ok: false };

  const idx = index ?? buildStrictIndex(foodCache);
  const tokens = new Set(tokenizeKeywordInput(normalized));
  if (tokens.size === 0) return { ok: false };

  const targetStatuses = new Map<string, "green" | "forbidden">();
  const candidates: import("./ingredientKeywordMap").KeywordCandidateMatch[] = [];

  for (const rule of KEYWORD_REGISTRY) {
    const targetKey = normalize(rule.foodItemNameRu);
    // Fail-closed: цель отсутствует в базе — правило игнорируется.
    const item = idx.byCanonicalName.get(targetKey);
    if (!item) continue;

    let matchedVariant: string | null = null;
    for (const v of rule.variants) {
      const vt = normalize(v);
      if (vt && tokens.has(vt)) {
        if (!matchedVariant || vt.length > matchedVariant.length) matchedVariant = vt;
      }
    }
    if (!matchedVariant) continue;

    targetStatuses.set(targetKey, item.wfpbStatus === "forbidden" ? "forbidden" : "green");
    candidates.push({ rule, matchedVariant });
  }

  const winner = pickKeywordWinner(candidates, targetStatuses);
  if (!winner) return { ok: false };

  const item = idx.byCanonicalName.get(normalize(winner.rule.foodItemNameRu));
  if (!item) return { ok: false }; // теоретически недостижимо (fail-closed выше)

  return {
    ok: true,
    foodItemId: item.id,
    canonicalName: item.nameRu,
    wfpbStatus: item.wfpbStatus === "forbidden" ? "forbidden" : "green",
    nutritionComplete: isNutritionComplete(item),
    resolutionMethod: "keyword",
  };
}

/**
 * Полная цепочка распознавания:
 * strict exact name → exact alias → controlled keyword → miss.
 * resolveIngredientStrict остаётся без изменений; метод этапа
 * определяется здесь аддитивно.
 */
export function resolveIngredientWithFallback(
  text: string,
  foodCache: StrictResolverItem[],
  index?: StrictIndex
): StrictResolveResult {
  const strict = resolveIngredientStrict(text, foodCache, index);
  if (strict.ok) {
    const key = normalize(text || "");
    const method: ResolutionMethod =
      (index ?? buildStrictIndex(foodCache)).byCanonicalName.has(key) ? "exact" : "alias";
    return { ...strict, resolutionMethod: method };
  }
  return resolveIngredientByKeyword(text, foodCache, index);
}
