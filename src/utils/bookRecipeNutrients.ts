import { normalize } from "./ingredientMappingCore";
import { applyRegistryRuntime, scheduleBookRegistryShadow } from "./bookRegistryShadow";

const normKey = normalize;
import decisions from "../../book-ingredient-decisions.json";
import { breakfastBackData } from "../data/breakfast_back";
import { lunchBackData } from "../data/lunch_back";
import { dinnerBackData } from "../data/dinner_back";
import { mustHaveBackData } from "../data/must_have_back";
import { recipeDayBackData } from "../data/recipe_day_back";
import { complimentsBackData } from "../data/compliments_back";
import type { ComplimentBackData } from "../data/compliments_back";

export type BookPartialReason =
  | "ingredient_unresolved"
  | "weight_missing"
  | "alternative_unresolved"
  | "recipe_data_unavailable"
  | "source_not_found";

export interface ResolvedBookIngredient {
  rawName: string;
  normalizedName: string;
  grams: number | null;
  excluded: boolean;
  unresolvedReason?: BookPartialReason;
  excludedRuleId?: string;
  excludedReason?: string;
  foodItemNameRu?: string;
  gramDefaultRuleId?: string;
}

export interface BookRecipeNutrientsResult {
  status: "complete" | "partial";
  partialReasons: BookPartialReason[];
  ingredients: ResolvedBookIngredient[];
}

// КБЖУ и клетчатка Книги остаются авторитетными: resolver никогда не эмитит эти поля.
export const BOOK_MACRO_FIELDS: ReadonlySet<string> = new Set([
  "calories",
  "protein",
  "fat",
  "carbohydrates",
  "fiber",
  "water",
]);

const BACK_SOURCE_MAP: Record<string, ComplimentBackData[] | null> = {
  breakfast: breakfastBackData,
  lunch: lunchBackData,
  dinner: dinnerBackData,
  must_have: mustHaveBackData,
  compliment: complimentsBackData,
  recipe_of_day: recipeDayBackData,
  drinks: null,
};

// Ключ источника в back-данных: `${sourceKey}_${id}` (конвенция getBookMacros).
function backSourceKey(bookRecipeType: string): string | null {
  if (bookRecipeType === "recipe_of_day") return "recipe_day";
  if (bookRecipeType === "drinks") return null;
  if (BACK_SOURCE_MAP[bookRecipeType] == null) return null;
  return bookRecipeType;
}

// Карта синонимов «как написано в Книге» -> точный nameRu из FoodItem.
// Ключи в нормализованной форме (нижний регистр, ё→е). Только подтверждённые записи БД.
export const BOOK_SYNONYMS: Record<string, string> = {
  "грецкие орехи": "Грецкий орех сырой",
  "орехи грецкие": "Грецкий орех сырой",
  "лен": "Льна семя сырой",
  "молотый лен": "Льна семя сырой",
  "льняное семя": "Льна семя сырой",
  "семя льна": "Льна семя сырой",
  "семена льна": "Льна семя сырой",
  "семечки льна": "Льна семя сырой",
  "льняная мука": "мука льняная",
  "кунжут": "семена кунжута белые",
  "семена кунжута": "семена кунжута белые",
  "семена чиа": "семена чиа белые",
  "чиа": "семена чиа белые",
  "семена тыквы": "Тыквы и кабачка семя сырой, сушён.",
  "семечки тыквы": "тыквенные семечки",
  "семя подсолнечника": "Подсолнечника семя сырой, сушён.",
  "мука из зелёной гречки": "мука гречневая",
  "мука из зеленой гречки": "мука гречневая",
  "зелёная гречка": "гречка зеленая",
  "зеленая гречка": "гречка зеленая",
  "овсяная мука": "мука овсяная",
  "яблоки": "яблоко",
  "яблоко кисло-сладкое": "яблоко",
  "бананы": "банан",
  "апельсины": "апельсин",
  "груши": "груша",
  "помидоры": "помидор",
  "огурцы": "огурец",
  "тыква": "Тыква сырая",
  "морковь большая": "морковь",
  "морковь маленькая": "морковь",
  "лук репчатый": "лук",
  "тёртый имбирь": "имбирь",
  "тертый имбирь": "имбирь",
  "корень имбиря": "имбирь",
  "тимьян": "тимьян свежий",
  "цветная капуста": "Цветная капуста сырая",
  "капуста цветная": "Цветная капуста сырая",
  "перец болгарский": "Перец сладкий зелёный",
  "перец сладкий": "Перец сладкий зелёный",
  "сухая красная чечевица": "чечевица",
  "красная чечевица": "чечевица",
  "сухая коричневая чечевица": "чечевица",
  "коричневая чечевица": "чечевица",
  "зелёная чечевица": "чечевица",
  "зеленая чечевица": "чечевица",
  "бурый рис": "рис коричневый",
  "рис бурый": "рис коричневый",
  "сухой нут": "Нут (турецкий горох) сырой",
  "нут": "Нут (турецкий горох) сырой",
  "белая фасоль": "Фасоль белая, сырая",
  "фасоль белая": "Фасоль белая, сырая",
  "красная фасоль": "Фасоль красная, сырая",
  "фасоль красная": "Фасоль красная, сырая",
  "зелёный горошек": "Горох зелёный сырой",
  "зеленый горошек": "Горох зелёный сырой",
  "сода пищевая": "сода",
  "уксус": "яблочный уксус",
  "уксус яблочный": "яблочный уксус",
  "лимонный сок": "Лимон свеж. сок",
  "сок лимона": "Лимон свеж. сок",
  "какао": "какао-порошок",
  "мисо": "мисо",
  // Детерминированные алиасы Phase 1. Конечные FoodItem проверены в БД
  // (семена мака, Руккола свежая, Кокос молоко, мисо — все green).
  "мак": "семена мака",
  "руккола": "Руккола свежая",
  "кокосовое молоко": "Кокос молоко",
  "мисо-паста": "мисо",
  "белая мисо-паста": "мисо",
  "светлая мисо-паста": "мисо",
  "мисо-соус": "мисо",
  "мисо-паста белая": "мисо",
  "мисо-паста светлая": "мисо",
  "сироп топинамбура": "сироп топинамбура",
  "финики": "финики",
  "смородина красная": "смородина красная",
  "черешня": "Черешня сырая",
  "рукола": "светло-красная рукола",
  "салат-латук": "салат",
  "томат": "помидор",
  "зелень": "петрушка",
  "свежая зелень": "петрушка",
  "любая свежая зелень": "петрушка",
  "зелень мелко рубленая": "петрушка",
  "кунжут молотый": "семена кунжута белые",
  "натуральная ваниль": "ваниль",
  "порошок чили": "кайенский перец",
  "кориандр молотый": "кориандр",
  "молотый кориандр": "кориандр",
  "тмин молотый": "тмин",
  "молотый кардамон": "кардамон",
  "щепотка асафетиды": "асафетида",
  "цейлонская корица": "корица",
  "сушеный чеснок": "чесночный порошок",
  "пищевые дрожжи": "пищевые неактивные дрожжи",
  "порошок сушеных шиитаке": "грибной порошок",
  "паприка сладкая": "паприка",
  "белокочанная капуста": "капуста белокочанная",
  "краснокочанная капуста": "светло-фиолетовая капуста",
  "квашеная капуста": "капуста квашеная",
  "ферментированная капуста": "капуста квашеная",
  "брюссельская капуста": "капуста брюссельская",
  "болгарский перец": "сладкий перец",
  "болгарский перец красный": "перец красный",
  "красный болгарский перец": "перец красный",
  "желтый болгарский перец": "перец жёлтый",
  "зеленый болгарский перец": "сладкий перец",
  "красный сладкий перец": "перец красный",
  "перец красный сладкий": "перец красный",
  "желтый сладкий перец": "перец жёлтый",
  "зеленый перец чили": "перец чили",
  "красный перец": "перец красный",
  "желтый перец": "перец жёлтый",
  "острый перец чили": "перец чили",
  "финик": "финики",
  "яблоко зеленое с кожурой": "яблоко",
  "яблоко зеленое": "яблоко",
  "листья пекинской капусты": "капуста пекинская",
  "красный лук": "лук красный",
  "лук зеленый": "зелёный лук",
  "репчатый лук": "лук",
  "свежий имбирь": "имбирь",
  "имбирь свежий": "имбирь",
  "свежий натертый имбирь": "имбирь",
  "имбирь тертый": "имбирь",
  "огурец свежий": "огурец",
  "морковь свежая": "морковь",
  "морковь тертая": "морковь",
  "морковь сырая тертая": "морковь",
  "помидор свежий": "помидор",
  "томаты": "помидор",
  "баклажаны": "баклажан",
  "кабачки": "кабачок",
  "кукуруза замороженная": "кукуруза",
  "грибы": "шампиньоны",
  "свежая петрушка": "петрушка",
  "салатные листья": "салат листья",
  "листья салата": "салат листья",
  "листовой салат": "салат листья",
  "запеченная свекла": "свекла",
  "свекла запеченная": "свекла",
  "кокосовая стружка несладкая": "кокосовая стружка",
  "подсолнечные семечки": "семена подсолнечника",
  "семечки подсолнечника": "семена подсолнечника",
  "тыквенные семечки сырые": "тыквенные семечки",
  "спелые бананы": "банан",
  "мякоть авокадо": "авокадо",
  "финики без косточек": "финики",
  "спелые финики": "финики",
  "запеченные яблоки": "яблоко",
  "зерна граната": "гранат",
  "черный рис": "рис черный",
  "овсяные хлопья без глютена": "овсяные хлопья",
  "овсяная мука без глютена": "овсяная мука",
  "мука зеленой гречки": "мука гречневая",
  "порошок из овсяных отрубей": "овсяные отруби",
  "газированная вода": "вода",
  "черная чечевица": "чечевица",
  "черная фасоль": "фасоль черная",
  "оранжевая чечевица": "чечевица красная",
  "вареный нут": "нут консервированный",
  "нут вареный": "нут консервированный",
  "фасоль": "фасоль красная",
  "горошек": "зеленый горошек замороженный",
  "свежий зеленый горошек": "горох зеленый",
  "семена льна молотые": "семена льна",
  "молотые семена льна": "семена льна",
  "льняное семя молотое": "семена льна",
  "лен молотый": "семена льна",
  // P1: точные алиасы на существующие green FoodItem (проверены в live БД).
  "вареная белая фасоль": "Фасоль белая, варёная",
  "белая фасоль вареная": "Фасоль белая, варёная",
  "готовая красная чечевица": "Чечевица варёная",
  "маш пророщенный": "Маш (бобы мунг) пророщенный",
  "проростки маша": "Маш (бобы мунг) пророщенный",
  "домашний тофу": "тофу",
  "тофу домашний": "тофу",
  "домашнее кокосовое молоко": "Кокос молоко",
  "молотый фенхель": "Фенхель семена",
  "порошок из семян фенхеля": "Фенхель семена",
  "семена сельдерея": "Сельдерей семена",
  "сладкая паприка": "паприка",
  "органическая сода": "сода",
  "черный кунжут": "кунжут чёрный",
};

const FILLER_PREFIX = /^(немного|чуть|примерно|около|по)\s+/;

// Все написания мисо в Книге. Резолвятся в FoodItem «мисо» ТОЛЬКО если
// wfpbStatus === "green" (в БД есть запрещённый FoodItem «мисо-паста», поэтому
// прямой матч на него для этих вариантов отбрасывается).
export const MISO_VARIANTS: ReadonlySet<string> = new Set([
  "мисо",
  "мисо-паста",
  "белая мисо-паста",
  "светлая мисо-паста",
  "мисо-соус",
  "мисо-паста белая",
  "мисо-паста светлая",
]);

// P1: узкие recipe-specific parser-фиксы. Ключ: `${bookRecipeType}_${bookRecipeId}`.
// 1) Строки-продолжения «или <ингредиент>» (recipe_day_29): убирается ТОЛЬКО
//    ведущее «или » перед resolution, другие строки не затрагиваются.
const BOOK_RECIPE_LEADING_OR: ReadonlySet<string> = new Set(["recipe_day_29"]);

// 2) Первая альтернатива «лимонного или апельсинового сока» (compliment_1):
//    нормализованный кандидат -> точный green FoodItem. Только в этом рецепте;
//    глобальный алиас «лимонного» НЕ добавляется.
const BOOK_RECIPE_SPECIFIC_MAPPINGS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  compliment_1: {
    "лимонного": "Лимон свеж. сок",
  },
};

// 3) P5B.1: recipe-specific parser override (compliment_11). Ключ — точная
//    исходная строка `${recipeKey}::${line}`. До splitAmount строка заменяется
//    на primary-часть «свежий натертый имбирь - 1 ст. л.»; хвост
//    «Если используете чеснок…» — информационная альтернатива. Другие строки
//    и рецепты не затрагиваются, глобальная политика splitAmount не меняется.
const BOOK_RECIPE_LINE_PRIMARY: Readonly<Record<string, string>> = {
  "compliment_11::свежий натертый имбирь - 1 ст. л. Если используете чеснок, тогда - 5 зубчиков целиком. Можно заменить асафетидой;":
    "свежий натертый имбирь - 1 ст. л.",
};

// P2: подтверждённые исключения (approved в book-ingredient-decisions.json,
// globalRules.p2Exclusions). Исключаются (excluded), а не weight_missing и не 1 г.
// A. Seasoning-количества без явного веса: «на кончике ножа», «по щепотке» —
//    только для подтверждённых специй. Строки с явным весом не затрагиваются.
const P2_SEASONING_ITEMS: ReadonlySet<string> = new Set([
  "асафетида",
  "тмин",
  "копченая паприка",
  "черный перец",
  "куркума",
  "куркума, черный перец",
]);

// B. Purpose-only строки (amount — чистая роль/цель, а не количество). Ключ —
//    recipeKey (entry.id). Только подтверждённые рецепты.
const P2_PURPOSE_MAP: Readonly<Record<string, ReadonlyArray<{ phrase: string; ruleId: string; reason: string }>>> = {
  must_have_5: [{ phrase: "для проращивания", ruleId: "p2_purpose_sprouting", reason: "purpose_only_sprouting" }],
  must_have_6: [
    { phrase: "для ферментации", ruleId: "p2_purpose_fermentation", reason: "purpose_only_fermentation" },
    { phrase: "для основы", ruleId: "p2_purpose_base", reason: "purpose_only_base" },
    { phrase: "по рецепту", ruleId: "p2_salt_recipe", reason: "purpose_only_recipe_salt" },
  ],
  must_have_7: [{ phrase: "для муки", ruleId: "p2_purpose_flour", reason: "purpose_only_flour" }],
  breakfast_18: [{ phrase: "для аромата", ruleId: "p2_purpose_aroma", reason: "purpose_only_aroma" }],
  compliment_5: [{ phrase: "для остроты", ruleId: "p2_purpose_heat", reason: "purpose_only_heat" }],
  compliment_7: [{ phrase: "см. совет дня", ruleId: "p2_purpose_tip_ref", reason: "purpose_only_tip_reference" }],
};

// D. Соль: точные строки исключаются; FoodItem «соль» НЕ добавляется и соль
//    НЕ маппится на другой продукт.
const P2_SALT_LINES: Readonly<Record<string, string>> = {
  recipe_day_1: "p2_salt_himalayan",
};

// P2: детерминированная проверка подтверждённых excluded-контекстов.
// Вызывается только при отсутствии явных грамм (grams == null).
function getP2Exclusion(
  recipeKey: string,
  candidate: string,
  amount: string
): { ruleId: string; reason: string } | null {
  const amt = normalize(amount).replace(/[«»"']/g, "");
  const norm = normalize(candidate);

  // A. Seasoning без веса.
  if (amt.includes("на кончике ножа") && P2_SEASONING_ITEMS.has(norm)) {
    return { ruleId: "p2_seasoning_knife_tip", reason: "seasoning_amount_on_knife_tip" };
  }
  if (amt.includes("по щепотке") && P2_SEASONING_ITEMS.has(norm)) {
    return { ruleId: "p2_seasoning_by_pinch", reason: "seasoning_amount_by_pinch" };
  }

  // B. Purpose-only (recipe-specific).
  const purpose = P2_PURPOSE_MAP[recipeKey];
  if (purpose) {
    for (const p of purpose) {
      if (amt.includes(normalize(p.phrase))) return { ruleId: p.ruleId, reason: p.reason };
    }
  }

  // B-спец: технологическая роль закваски кодзи в must_have_6 (рецепт мисо-пасты).
  if (recipeKey === "must_have_6" && norm.includes("aspergillus") && amt.includes("закваска")) {
    return { ruleId: "p2_purpose_koji", reason: "purpose_only_koji_starter" };
  }

  // D. Гималайская соль (recipe_day_1).
  const saltRule = P2_SALT_LINES[recipeKey];
  if (saltRule && norm.includes("гималайская соль")) {
    return { ruleId: saltRule, reason: "purpose_only_himalayan_salt" };
  }

  return null;
}

export interface FoodItemNameIndexEntry {
  nameRu: string;
  wfpbStatus: string;
}

// Единая детерминированная резолюция имени Книги -> точный nameRu FoodItem.
// Прямой матч по нормализованному имени, затем точный синоним из BOOK_SYNONYMS.
// Для вариантов мисо результат допускается только при wfpbStatus === "green".
// Никакого неявного fuzzy-поиска.
export function resolveBookName(
  candidate: string,
  index: Map<string, FoodItemNameIndexEntry>
): string | null {
  const norm = normalize(candidate);
  const isMisoVariant = MISO_VARIANTS.has(norm);
  const lookup = (key: string): string | null => {
    const rec = index.get(key);
    if (!rec) return null;
    if (isMisoVariant && rec.wfpbStatus !== "green") return null;
    return rec.nameRu;
  };
  const direct = lookup(norm);
  if (direct) return direct;
  const synonymTarget = BOOK_SYNONYMS[norm];
  if (synonymTarget) return lookup(normalize(synonymTarget));
  return null;
}

// Описательные слова Книги, не меняющие продукт. Убираются ДО resolveName
// только из названий ингредиентов (не из синонимов и не из FoodItem).
const BOOK_DESCRIPTIVE_WORDS: ReadonlySet<string> = new Set([
  "большой", "большая", "большое", "большие",
  "крупный", "крупная", "крупное", "крупные",
  "средний", "средняя", "среднее", "средние",
  "сухой", "сухая", "сухое", "сухие",
  "очищенный", "очищенная", "очищенное", "очищенные",
  "нарезанный", "нарезанная", "нарезанное", "нарезанные",
  "кубиками", "черешок",
]);

// Безопасный normalizer для Book-ingredient names: нижний регистр, убрать
// весовые части/скобки/пунктуацию и описательные слова. Без неограниченного
// поиска по первым словам и без замены продукта (напр. «томатная паста»→«помидор»).
export function normalizeBookIngredientName(name: string): string {
  const lower = normalize(name);
  const noPunct = lower
    .replace(/[()\[\]{}«»"',.;:!?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = noPunct.split(/\s+/).filter((w) => !BOOK_DESCRIPTIVE_WORDS.has(w));
  return words.join(" ");
}

export function splitAmount(line: string): { name: string; amount: string } | null {
  const re = /\s+[-–—]\s+/g;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  // P5A: учитывать разделитель только на нулевой глубине круглых скобок,
  // чтобы тире внутри пояснений/альтернатив («(тогда - 4 зубчика…)»)
  // не разбивали строку.
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
  const sepStart = last.index;
  const sepEnd = sepStart + last[0].length;
  return {
    name: line.slice(0, sepStart).trim(),
    amount: line.slice(sepEnd).trim(),
  };
}

export function cleanName(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\*/g, " ")
    .replace(/[.,;]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitAlternatives(name: string): string[] {
  const parts = name.split(/\s+(?:или)\s+|\//g);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function isWater(name: string): boolean {
  const n = normalize(name);
  return /^вода(\s|$)/.test(n) || n.indexOf("кипяток") !== -1 || n === "горячая вода";
}

export function isSeasoningAmount(amount: string): boolean {
  const n = normalize(amount);
  return n.indexOf("по вкусу") !== -1 || n.indexOf("по желанию") !== -1 || /^щепотк/.test(n);
}

export function parseGrams(amount: string): number | null {
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

// Явные gram-дефолты из book-ingredient-decisions.json (globalRules.gramDefaults).
// Применяются только к точным ingredient-ключам, только если кандидат
// резолвится в green FoodItem и отсутствует явный вес.
// Поля amount допускает exact-amount гранулярность («1 tsp», «0.25 tsp», «1 tbsp»).
interface GramDefaultRule {
  ruleId: string;
  key: string;
  grams: number;
  coverVariants?: boolean;
  amount?: string;
  pieceAmount?: string;
}

const AMT_FRACTIONS: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 0.33, "⅔": 0.67, "⅛": 0.125,
};

// Parse quantity from Russian measure strings: "1 ч. л.", "½ ч. л.", "1,3 ч. л.", etc.
function parseAmountValue(amount: string): number | null {
  const n = normalize(amount).trim();
  
  // Handle decimal notation like "1,3 ч. л." or "1.5 ч. л."
  const decRe = /^([\d][\d,.]*)\s+[а-я]/i;
  const dMatch = n.match(decRe);
  if (dMatch) {
    const val = parseFloat(dMatch[1].replace(",", "."));
    if (!isNaN(val)) return val;
  }
  
  // Handle whole numbers: "1 ч. л.", "2 ч. л."
  const intRe = /^\d+\s+/;
  const iMatch = n.match(intRe);
  if (iMatch) {
    return Number(iMatch[0].trim());
  }
  
  // Handle single fractions: "½ ч. л.", "¼ ч. л."
  const fracRe = /^[⅓½¼¾⅔⅛]/;
  const fMatch = n.match(fracRe);
  if (fMatch) {
    const base = AMT_FRACTIONS[fMatch[0]];
    if (base != null) return base;
  }
  
  // Handle mixed fractions: "1½ ч. л.", "2¼ ч. л."
  const mixedRe = /^(?<whole>\d+)\s?(?<frac>[⅓½¼¾⅔⅛])/;
  const mMatch = n.match(mixedRe);
  if (mMatch) {
    const whole = Number(mMatch.groups?.whole ?? "0");
    const frac = mMatch.groups?.frac;
    if (frac) {
      const base = AMT_FRACTIONS[frac];
      if (base != null) return whole + base;
    }
  }
  
  return null;
}

// P4A: канонизация amount для точных piece-правил («1 шт.», «1 шт;», «1 шт.» → «1 шт»).
export function pieceAmountKey(amount: string): string {
  return normalize(amount)
    .replace(/[.,;:!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// P4A: точный выбор piece-based gram-default. Без fuzzy matching: только
// точное совпадение ingredientKey + канонического amount. Существующие
// tsp/tbsp-правила (amountKey) не затрагиваются.
function pickExactPieceRule(
  defaults: Map<string, GramDefaultRule[]>,
  key: string,
  amount: string
): GramDefaultRule | null {
  const arr = defaults.get(key);
  if (!arr || arr.length === 0) return null;
  const pieceK = pieceAmountKey(amount);
  if (!pieceK) return null;
  return arr.find((r) => r.pieceAmount === pieceK) ?? null;
}

function amountKey(amount: string): string | null {
  const value = parseAmountValue(amount);
  if (value == null) return null;
  
  const n = normalize(amount).trim();
  // Detect measure: столовая ложка (ст. л.) vs чайная ложка (ч. л.)
  const isTablespoon = /ст/.test(n);
  const measure = isTablespoon ? "tbsp" : "tsp";
  
  // Format value consistently: 0.25, 0.5, 1, 1.3, 1.5, etc.
  let formatted: string;
  if (value % 1 === 0) {
    formatted = String(value);
  } else {
    // Round to avoid floating point artifacts
    formatted = Number(value.toFixed(2)).toString();
  }
  return `${formatted} ${measure}`;
}

let gramDefaultsCache: Map<string, GramDefaultRule[]> | null = null;

function loadGramDefaults(): Map<string, GramDefaultRule[]> {
  if (gramDefaultsCache) return gramDefaultsCache;
  const map = new Map<string, GramDefaultRule[]>();
  try {
    for (const rule of (decisions as any)?.globalRules?.gramDefaults ?? []) {
      if (!rule || typeof rule.ingredientKey !== "string" || typeof rule.gramsWhenMissing !== "number" || rule.gramsWhenMissing <= 0) continue;
      const key = normalize(rule.ingredientKey);
      if (!key) continue;
      const entry: GramDefaultRule = {
        ruleId: String(rule.ruleId ?? key),
        key,
        grams: rule.gramsWhenMissing,
        coverVariants: rule.coverVariants === true,
      };
      if (typeof rule.amount === "string" && rule.amount) entry.amount = rule.amount;
      if (typeof rule.pieceAmount === "string" && rule.pieceAmount.trim()) {
        entry.pieceAmount = pieceAmountKey(rule.pieceAmount);
      }
      const arr = map.get(key);
      if (arr) arr.push(entry);
      else map.set(key, [entry]);
    }
  } catch {
    // Decisions file недоступен на рантайме: gram-дефолты не применяются.
  }
  gramDefaultsCache = map;
  return map;
}

function pickGramRule(
  defaults: Map<string, GramDefaultRule[]>,
  key: string,
  amount: string
): GramDefaultRule | null {
  const arr = defaults.get(key);
  if (!arr || arr.length === 0) return null;
  const amtK = amountKey(amount);
  if (amtK) {
    const exact = arr.find((r) => r.amount === amtK);
    if (exact) return exact;
  }
  const generic = arr.find((r) => r.amount == null);
  if (generic) return generic;
  return null;
}

// F1A: exact excluded decisions (book-ingredient-decisions.json, ingredients[]
// c action === "excluded"). Ключ — ТОТ ЖЕ pipeline, что и у строк Книги:
// cleanName(sourceName) + normalizeBookIngredientName. Только точное
// равенство; actions foodKey/split/split_scaled/use_recipe_source и прочие
// не загружаются.
let excludedDecisionsCache: Map<string, { reason: string }> | null = null;

function loadExcludedDecisions(): Map<string, { reason: string }> {
  if (excludedDecisionsCache) return excludedDecisionsCache;
  const map = new Map<string, { reason: string }>();
  try {
    for (const ing of (decisions as any)?.ingredients ?? []) {
      if (!ing || ing.action !== "excluded" || typeof ing.sourceName !== "string") continue;
      const key = normalizeBookIngredientName(cleanName(ing.sourceName));
      if (key && !map.has(key)) {
        map.set(key, { reason: typeof ing.reason === "string" ? ing.reason : "excluded" });
      }
    }
  } catch {
    // Decisions file недоступен на рантайме: exact excluded не применяются.
  }
  excludedDecisionsCache = map;
  return map;
}

// F1B: exact foodKey decisions — ТОЛЬКО одобренный F1B-safe subset (4 записи):
// target резолвится в exact green FoodItem, источник граммов однозначен
// (parsed grams или gramsWhenMissing), recipeId-конфликтов нет. Остальные
// foodKey-записи (включая томатную пасту без масла, льняное «яйцо», льняной
// гель и все с recipeId/components/ratio) не загружаются и не исполняются.
let foodKeyDecisionsCache: Map<string, { foodKey: string; grams?: number; gramsWhenMissing?: number }> | null = null;

function loadFoodKeyDecisions(): Map<string, { foodKey: string; grams?: number; gramsWhenMissing?: number }> {
  if (foodKeyDecisionsCache) return foodKeyDecisionsCache;
  const map = new Map<string, { foodKey: string; grams?: number; gramsWhenMissing?: number }>();
  const safeKeys = new Set(
    [
      "кешью-соус",
      "яблочный джем без сахара",
      "жёлтый горох колотый",
      "паста из тыквенных семечек",
    ].map((s) => normalizeBookIngredientName(cleanName(s)))
  );
  try {
    for (const ing of (decisions as any)?.ingredients ?? []) {
      if (!ing || ing.action !== "foodKey" || typeof ing.sourceName !== "string" || typeof ing.foodKey !== "string") continue;
      const key = normalizeBookIngredientName(cleanName(ing.sourceName));
      if (!safeKeys.has(key) || map.has(key)) continue;
      const entry: { foodKey: string; grams?: number; gramsWhenMissing?: number } = { foodKey: ing.foodKey };
      if (typeof ing.grams === "number") entry.grams = ing.grams;
      if (typeof ing.gramsWhenMissing === "number") entry.gramsWhenMissing = ing.gramsWhenMissing;
      map.set(key, entry);
    }
  } catch {
    // Decisions file недоступен на рантайме: exact foodKey не применяются.
  }
  foodKeyDecisionsCache = map;
  return map;
}

// F2S1: exact split decisions (action === "split"). Исполнение только при
// parsed grams строки (распределение по fixed grams / ratio) ИЛИ exact
// perHandful-override для канонического amount «1 горсть». Все counted
// foodKey должны exact resolveName() в green FoodItem — иначе fail closed.
// Scope safety (F2S1 scope): allowlist exact sourceName + разрешённые
// recipeId; выбор правила только по паре (normalized key, entry.id).
interface SplitComponent {
  foodKey: string;
  ratio?: number;
  grams?: number;
}

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

let splitDecisionsCache: Map<
  string,
  {
    components: SplitComponent[];
    perHandful?: Array<{ foodKey: string; grams: number }>;
    allowedRecipeIds: ReadonlySet<string>;
  }
> | null = null;

function loadSplitDecisions(): Map<
  string,
  {
    components: SplitComponent[];
    perHandful?: Array<{ foodKey: string; grams: number }>;
    allowedRecipeIds: ReadonlySet<string>;
  }
> {
  if (splitDecisionsCache) return splitDecisionsCache;
  const map = new Map<
    string,
    {
      components: SplitComponent[];
      perHandful?: Array<{ foodKey: string; grams: number }>;
      allowedRecipeIds: ReadonlySet<string>;
    }
  >();
  try {
    for (const approved of F2S1_APPROVED_SPLITS) {
      const key = normalizeBookIngredientName(cleanName(approved.sourceName));
      if (!key || map.has(key)) continue;
      const ing = ((decisions as any)?.ingredients ?? []).find(
        (i: any) => i?.action === "split" && normalizeBookIngredientName(cleanName(i.sourceName ?? "")) === key
      );
      if (!ing || !Array.isArray(ing.components)) continue;
      const components: SplitComponent[] = [];
      for (const c of ing.components) {
        if (!c || typeof c.foodKey !== "string") continue;
        if (typeof c.ratio === "number") components.push({ foodKey: c.foodKey, ratio: c.ratio });
        else if (typeof c.grams === "number") components.push({ foodKey: c.foodKey, grams: c.grams });
      }
      let perHandful: Array<{ foodKey: string; grams: number }> | undefined;
      if (Array.isArray(ing.perHandful)) {
        const ph: Array<{ foodKey: string; grams: number }> = [];
        for (const p of ing.perHandful) {
          if (p && typeof p.foodKey === "string" && typeof p.grams === "number") ph.push({ foodKey: p.foodKey, grams: p.grams });
        }
        if (ph.length) perHandful = ph;
      }
      map.set(key, { components, perHandful, allowedRecipeIds: new Set(approved.recipeIds) });
    }
  } catch {
    // Decisions file недоступен на рантайме: exact split не применяются.
  }
  splitDecisionsCache = map;
  return map;
}

// F2-each: exact each-splits — масса КАЖДОГО компонента (approved):
//   compliment_13 «тмин + кориандр — по 1 ч. л.»  → тмин 6 г + кориандр 6 г
//   lunch_15     «орегано, тмин — по ½ ч. л.»     → орегано 3 г + тмин 3 г
//   recipe_day_7 «укроп, петрушка — 1 ст. л.»     → укроп 6 г + петрушка 6 г
// Матч: normalized key + exact recipeId + канонический amount.
interface EachSplitRule {
  components: Array<{ foodKey: string; grams: number }>;
  matchPieceKey: string;
  allowedRecipeIds: ReadonlySet<string>;
}

let eachSplitDecisionsCache: Map<string, EachSplitRule> | null = null;

function loadEachSplitDecisions(): Map<string, EachSplitRule> {
  if (eachSplitDecisionsCache) return eachSplitDecisionsCache;
  const map = new Map<string, EachSplitRule>();
  const approved: ReadonlyArray<{ sourceName: string; recipeId: string }> = [
    { sourceName: "тмин + кориандр", recipeId: "compliment_13" },
    { sourceName: "орегано, тмин", recipeId: "lunch_15" },
    { sourceName: "укроп, петрушка", recipeId: "recipe_day_7" },
  ];
  try {
    const all = (decisions as any)?.ingredients ?? [];
    for (const a of approved) {
      const key = normalizeBookIngredientName(cleanName(a.sourceName));
      if (!key || map.has(key)) continue;
      const ing = all.find(
        (i: any) => i?.action === "split" && normalizeBookIngredientName(cleanName(i.sourceName ?? "")) === key
      );
      if (!ing || !Array.isArray(ing.eachGrams) || typeof ing.eachMatchPieceKey !== "string") continue;
      const components: Array<{ foodKey: string; grams: number }> = [];
      for (const c of ing.eachGrams) {
        if (c && typeof c.foodKey === "string" && typeof c.grams === "number") {
          components.push({ foodKey: c.foodKey, grams: c.grams });
        }
      }
      if (components.length) {
        map.set(key, { components, matchPieceKey: ing.eachMatchPieceKey, allowedRecipeIds: new Set([a.recipeId]) });
      }
    }
  } catch {
    // Decisions file недоступен на рантайме: each-split не применяются.
  }
  eachSplitDecisionsCache = map;
  return map;
}

export async function resolveBookRecipeNutrients(
  bookRecipeType: string,
  bookRecipeId: number
): Promise<BookRecipeNutrientsResult> {
  const partialReasons: BookPartialReason[] = [];
  let ingredients: ResolvedBookIngredient[] = [];
  const addReason = (reason: BookPartialReason) => {
    if (!partialReasons.includes(reason)) partialReasons.push(reason);
  };

  const sourceKey = backSourceKey(bookRecipeType);
  const sourceArr = sourceKey != null ? BACK_SOURCE_MAP[bookRecipeType] : null;
  if (sourceArr == null) {
    addReason("recipe_data_unavailable");
    return { status: "partial", partialReasons, ingredients };
  }

  const entry = sourceArr.find((d) => d.id === `${sourceKey}_${bookRecipeId}`);
  if (!entry) {
    addReason("source_not_found");
    return { status: "partial", partialReasons, ingredients };
  }

  // P3: structuredIngredients override (authoritative).
  // Apply only to exact matches of originalName to rawName.
  const structuredIngredients = entry.structuredIngredients ?? [];

  const { prisma } = await import("../prisma");
  const items = await prisma.foodItem.findMany({
    select: { nameRu: true, wfpbStatus: true },
  });
  const nameRuIndex = new Map<string, FoodItemNameIndexEntry>();
  for (const it of items) {
    const key = normalize(it.nameRu);
    if (key && !nameRuIndex.has(key)) nameRuIndex.set(key, { nameRu: it.nameRu, wfpbStatus: it.wfpbStatus });
  }

  const resolveName = (candidate: string): string | null => resolveBookName(candidate, nameRuIndex);

  for (const line of entry.ingredients) {
    // P5B.1: recipe-specific primary-часть строки до splitAmount (compliment_11).
    const line0 = BOOK_RECIPE_LINE_PRIMARY[`${entry.id}::${line}`] ?? line;
    const sp = splitAmount(line0);
    if (!sp) continue;
    const clean0 = cleanName(sp.name);
    if (!clean0) continue;
    // P1: строки-продолжения «или <ингредиент>» — убрать только ведущее «или »
    // (recipe_day_29). Другие строки не затрагиваются.
    const recipeKey = entry.id;
    const clean = BOOK_RECIPE_LEADING_OR.has(recipeKey) ? clean0.replace(/^или\s+/i, "") : clean0;

    const options = splitAlternatives(clean);
    if (options.some(isWater)) {
      // «вода или X» / «вода / X»: строка целиком исключается, partial не ставится.
      ingredients.push({ rawName: sp.name, normalizedName: clean, grams: parseGrams(sp.amount), excluded: true });
      continue;
    }

    const candidate = options.length > 1 ? options[0].replace(FILLER_PREFIX, "") : clean;
    const hasAlternatives = options.length > 1;
    const grams = parseGrams(sp.amount);

    // F1A: exact excluded decisions — применяется к обеим веткам (grams==null и
    // grams!=null), после water/P2-логики; P2 остаётся без изменений.
    const decExcluded = loadExcludedDecisions().get(normalizeBookIngredientName(clean));
    if (decExcluded) {
      ingredients.push({
        rawName: sp.name,
        normalizedName: candidate,
        grams: null,
        excluded: true,
        excludedReason: decExcluded.reason,
      });
      continue;
    }

    // F1B: exact foodKey decisions (approved safe subset). Target должен
    // резолвиться в exact green FoodItem; grams = parsed, иначе decision
    // grams/gramsWhenMissing.
    const decFood = loadFoodKeyDecisions().get(normalizeBookIngredientName(clean));
    if (decFood) {
      const targetNorm = normalize(decFood.foodKey);
      const matched = resolveName(targetNorm);
      if (matched && nameRuIndex.get(normalize(matched))?.wfpbStatus === "green") {
        const resolvedGrams = grams ?? decFood.grams ?? decFood.gramsWhenMissing ?? null;
        ingredients.push({
          rawName: sp.name,
          normalizedName: candidate,
          grams: resolvedGrams,
          excluded: false,
          foodItemNameRu: matched,
        });
        continue;
      }
    }

    // F2-each: exact each-splits (approved). Каждый counted компонент получает
    // свою фиксированную массу; матч по key + recipeId + каноническому amount.
    const decEach = loadEachSplitDecisions().get(normalizeBookIngredientName(clean));
    if (decEach && decEach.allowedRecipeIds.has(entry.id) && decEach.matchPieceKey === pieceAmountKey(sp.amount)) {
      const emitted: Array<{ nameRu: string; grams: number }> = [];
      let valid = true;
      for (const c of decEach.components) {
        const matched = resolveName(normalize(c.foodKey));
        if (!matched || nameRuIndex.get(normalize(matched))?.wfpbStatus !== "green") {
          valid = false;
          break;
        }
        emitted.push({ nameRu: matched, grams: c.grams });
      }
      if (valid && emitted.length) {
        for (const em of emitted) {
          ingredients.push({
            rawName: sp.name,
            normalizedName: candidate,
            grams: em.grams,
            excluded: false,
            foodItemNameRu: em.nameRu,
          });
        }
        continue;
      }
      // fail closed: продолжается существующий путь исходной строки
    }

    // F2S1: exact split decisions. Parsed grams -> fixed/ratio распределение;
    // без grams — только exact perHandful для «1 горсть». Fail closed:
    // любой незарезолвенный/не-green foodKey отменяет весь emit.
    const decSplit = loadSplitDecisions().get(normalizeBookIngredientName(clean));
    if (decSplit && decSplit.allowedRecipeIds.has(entry.id)) {
      let handout: Array<{ foodKey: string; grams: number }> | null = null;
      if (grams != null) {
        const ratioSum = decSplit.components.reduce((s, c) => s + (c.ratio ?? 0), 0);
        const ratiosOk =
          !decSplit.components.some((c) => typeof c.ratio === "number") || Math.abs(ratioSum - 1) < 1e-6;
        if (ratiosOk) {
          handout = [];
          for (const c of decSplit.components) {
            if (typeof c.grams === "number") handout.push({ foodKey: c.foodKey, grams: c.grams });
            else if (typeof c.ratio === "number") handout.push({ foodKey: c.foodKey, grams: grams * c.ratio });
          }
        }
      } else if (decSplit.perHandful?.length && pieceAmountKey(sp.amount) === "1 горсть") {
        handout = decSplit.perHandful.map((p) => ({ foodKey: p.foodKey, grams: p.grams }));
      }
      if (handout && handout.length) {
        const emitted: Array<{ nameRu: string; grams: number }> = [];
        let valid = true;
        for (const h of handout) {
          const matched = resolveName(normalize(h.foodKey));
          if (!matched || nameRuIndex.get(normalize(matched))?.wfpbStatus !== "green") {
            valid = false;
            break;
          }
          emitted.push({ nameRu: matched, grams: h.grams });
        }
        if (valid && emitted.length) {
          for (const em of emitted) {
            ingredients.push({
              rawName: sp.name,
              normalizedName: candidate,
              grams: em.grams,
              excluded: false,
              foodItemNameRu: em.nameRu,
            });
          }
          continue;
        }
      }
      // fail closed: продолжается существующий путь исходной строки
    }

    if (grams == null) {
      // P2: подтверждённые excluded-контексты (seasoning без веса / purpose-only /
      // соль). Не считается weight_missing и не unresolved.
      const p2 = getP2Exclusion(recipeKey, candidate, sp.amount);
      if (p2) {
        ingredients.push({
          rawName: sp.name,
          normalizedName: candidate,
          grams: null,
          excluded: true,
          excludedRuleId: p2.ruleId,
          excludedReason: p2.reason,
        });
        console.info(`[BookNutrients] EXCLUDED ${entry.id} :: ${sp.name} :: ${p2.ruleId} :: ${p2.reason}`);
        continue;
      }
      if (isSeasoningAmount(sp.amount)) {
        ingredients.push({ rawName: sp.name, normalizedName: candidate, grams: null, excluded: true });
      } else {
        // P3.1: build preparationKey from sp.name before cleanName strips parens
        const prepMatch = /^([^()]+)\s*\(([^)]+)\)/.exec(sp.name);
        const preparationKey = prepMatch
          ? `${normalize(prepMatch[1].trim())} ${normalize(prepMatch[2].trim())}`
          : null;
        
        const norm = normalizeBookIngredientName(candidate);
        const defaults = loadGramDefaults();
        // Try preparationKey first (e.g., "имбирь молотый"), then fall back to norm
        let rule = preparationKey ? pickGramRule(defaults, preparationKey, sp.amount) : null;
        if (!rule) rule = pickGramRule(defaults, norm, sp.amount);
        if (!rule && MISO_VARIANTS.has(norm)) rule = pickGramRule(defaults, "мисо", sp.amount);
        const guardOk =
          rule != null &&
          !hasAlternatives &&
          !sp.amount.includes("+") &&
          !/на кончике ножа/.test(sp.amount) &&
          !sp.amount.includes("опционально");
        if (guardOk) {
          // P3: structuredIngredients override.
          const ov = structuredIngredients.find((o) => normKey(o.originalName) === normKey(clean0));
          if (ov) {
            const resolved = resolveName(ov.foodKey);
            if (resolved) {
              ingredients.push({
                rawName: sp.name,
                normalizedName: candidate,
                grams: ov.grams ?? rule.grams,
                excluded: false,
                foodItemNameRu: resolved,
                gramDefaultRuleId: rule.ruleId,
              });
              continue;
            } else {
              addReason("ingredient_unresolved");
              ingredients.push({
                rawName: sp.name,
                normalizedName: candidate,
                grams: null,
                excluded: true,
                unresolvedReason: "ingredient_unresolved",
                excludedReason: `structured foodKey "${ov.foodKey}" does not resolve to a FoodItem`,
              });
              continue;
            }
          }
          const matched = resolveName(norm);
          if (matched) {
            ingredients.push({
              rawName: sp.name,
              normalizedName: candidate,
              grams: rule.grams,
              excluded: false,
              foodItemNameRu: matched,
              gramDefaultRuleId: rule.ruleId,
            });
            continue;
          }
        }
        // P4A: exact piece-based gram-defaults. Только при отсутствии обычного
        // правила, без альтернатив, «+», «по вкусу», «на кончике ножа»,
        // «опционально»; кандидат должен резолвиться в FoodItem.
        if (rule == null && !hasAlternatives) {
          const pieceRule = pickExactPieceRule(defaults, norm, sp.amount);
          const pieceOk =
            pieceRule != null &&
            !sp.amount.includes("+") &&
            !/на кончике ножа|по вкусу|опционально/.test(sp.amount);
          if (pieceOk && pieceRule) {
            const matched = resolveName(norm);
            if (matched) {
              ingredients.push({
                rawName: sp.name,
                normalizedName: candidate,
                grams: pieceRule.grams,
                excluded: false,
                foodItemNameRu: matched,
                gramDefaultRuleId: pieceRule.ruleId,
              });
              continue;
            }
          }
        }
        addReason("weight_missing");
        ingredients.push({
          rawName: sp.name,
          normalizedName: candidate,
          grams: null,
          excluded: true,
          unresolvedReason: "weight_missing",
        });
      }
      continue;
    }

    const norm = normalizeBookIngredientName(candidate);
    // P1: узкий recipe-specific маппинг (compliment_1, «лимонного» в первой
    // альтернативе) — не глобальный алиас.
    // P3: structuredIngredients override (authoritative).
    // Apply only to exact matches of originalName to rawName.
    const ov = structuredIngredients.find((o) => normKey(o.originalName) === normKey(clean0));
    const specTarget = BOOK_RECIPE_SPECIFIC_MAPPINGS[recipeKey]?.[norm];
    const matched = ov ? resolveName(ov.foodKey) : (specTarget ? resolveName(specTarget) : resolveName(norm));
    if (!matched) {
      // P3: structuredIngredients override failed.
      if (ov) {
        addReason("ingredient_unresolved");
        ingredients.push({
          rawName: sp.name,
          normalizedName: candidate,
          grams: null,
          excluded: true,
          unresolvedReason: "ingredient_unresolved",
          excludedReason: `structured foodKey "${ov.foodKey}" does not resolve to a FoodItem`,
        });
      } else {
        addReason("ingredient_unresolved");
        ingredients.push({
          rawName: sp.name,
          normalizedName: candidate,
          grams,
          excluded: true,
          unresolvedReason: "ingredient_unresolved",
        });
      }
    } else {
      ingredients.push({
        rawName: sp.name,
        normalizedName: candidate,
        grams: ov?.grams ?? grams,
        excluded: false,
        foodItemNameRu: matched,
      });
    }
  }

  const status: "complete" | "partial" = partialReasons.length === 0 ? "complete" : "partial";
  if (status === "partial") {
    console.info(
      `[BookNutrients] ${bookRecipeType}/${bookRecipeId} partial reasons=${partialReasons.join(",")}`
    );
  } else {
    console.info(`[BookNutrients] ${bookRecipeType}/${bookRecipeId} complete (${ingredients.length} ingredients)`);
  }

  let finalIngredients = ingredients;

  // F-shadow: compiled registry исполняется параллельно; legacy результат
  // остаётся authoritative — shadow не влияет на return и не бросает ошибок.
  scheduleBookRegistryShadow(`${sourceKey}_${bookRecipeId}`, entry.ingredients, structuredIngredients, {
    status,
    partialReasons,
    ingredients: finalIngredients,
  });

  // BOOK_REGISTRY_RUNTIME=1: compiled registry — primary resolver. Legacy
  // вызван выше и служит fallback для deferred/unsupported/approved_partial;
  // при расхождении registry vs legacy registry-результат отбрасывается.
  if (process.env.BOOK_REGISTRY_RUNTIME === "1") {
    const runtimeIndex = new Map<string, { nameRu: string; wfpbStatus: string }>();
    for (const it of items) {
      const k = normalize(it.nameRu);
      if (k && !runtimeIndex.has(k)) runtimeIndex.set(k, { nameRu: it.nameRu, wfpbStatus: it.wfpbStatus });
    }
    const compiledIngredients = applyRegistryRuntime(
      `${sourceKey}_${bookRecipeId}`,
      entry.ingredients,
      structuredIngredients,
      { status, partialReasons, ingredients: finalIngredients },
      runtimeIndex
    );
    if (compiledIngredients !== finalIngredients) {
      finalIngredients = compiledIngredients;
    }
  }

  return { status, partialReasons, ingredients: finalIngredients };
}
