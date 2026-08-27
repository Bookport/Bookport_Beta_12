import { normalize } from "./ingredientMappingCore";

// ─────────────────────────────────────────────────────────────────────────────
// Централизованный controlled keyword-реестр распознавания.
//
// Это НЕ fuzzy и НЕ substring: матчинг — точное равенство нормализованного
// токена ввода явному варианту из variants. Формы слов перечисляются вручную,
// без stemming.
//
// Fail-closed: правило активно только если target foodItemNameRu существует
// в FoodItem-индексе (проверяется в resolveIngredientByKeyword).
// Статус/категория таргета НЕ дублируются здесь — берутся из найденного FoodItem.
// ─────────────────────────────────────────────────────────────────────────────

export interface KeywordRule {
  /** Доменный ключ правила (для логирования/tie-break). */
  key: string;
  /** Точное canonical nameRu существующего FoodItem. */
  foodItemNameRu: string;
  /** Приоритет: больше = сильнее при конфликте нескольких ключей. */
  priority: number;
  /** Явные формы слов (токены), точное равенство после normalize(). */
  variants: string[];
}

/**
 * Приоритеты (доменное соглашение):
 *  100 — масло (доминирует над упоминаниями продуктов, напр. «масло с ароматом баранины»);
 *   95 — соль;
 *   90 — виды и формы мяса;
 *   78 — яйца (обlique-формы, не покрытые alias'ом);
 *   62–58 — конкретные виды рыбы;
 *   55 — морепродукты.
 */
export const KEYWORD_REGISTRY: KeywordRule[] = [
  // ── Масла ──
  {
    key: "масло",
    foodItemNameRu: "масло",
    priority: 100,
    variants: ["масло", "масла", "маслу", "маслом", "масле"],
  },

  // ── Соль ──
  {
    key: "соль",
    foodItemNameRu: "Соль столовая",
    priority: 95,
    variants: ["соль", "соли", "солью", "солей", "солях"],
  },

  // ── Виды и формы мяса ──
  {
    key: "баранина",
    foodItemNameRu: "баранина",
    priority: 90,
    variants: ["баранина", "баранины", "баранину", "бараниной", "баранине"],
  },
  {
    key: "ягнятина",
    foodItemNameRu: "ягнятина",
    priority: 90,
    variants: ["ягнятина", "ягнятины", "ягнятину", "ягнятиной"],
  },
  {
    key: "говядина",
    foodItemNameRu: "говядина",
    priority: 90,
    variants: ["говядина", "говядины", "говядину", "говядиной"],
  },
  {
    key: "свинина",
    foodItemNameRu: "свинина",
    priority: 90,
    variants: ["свинина", "свинины", "свинину", "свининой"],
  },
  {
    key: "телятина",
    foodItemNameRu: "телятина",
    priority: 90,
    variants: ["телятина", "телятины", "телятину", "телятиной"],
  },

  // ── Яйца (oblique-формы; именительные уже покрыты exact/alias) ──
  {
    key: "яйца",
    foodItemNameRu: "яйцо куриное",
    priority: 78,
    variants: ["яиц", "яйцам", "яйцами", "яйцах", "яичко", "яичка"],
  },

  // ── Конкретные виды рыбы ──
  {
    key: "лосось",
    foodItemNameRu: "лосось",
    priority: 62,
    variants: ["лосось", "лосося", "лососю", "лососем", "лососе"],
  },
  {
    key: "семга",
    foodItemNameRu: "семга",
    priority: 62,
    variants: ["семга", "семгу", "семгой", "семге"],
  },
  {
    key: "форель",
    foodItemNameRu: "форель",
    priority: 62,
    variants: ["форель", "форели", "форелью"],
  },
  {
    key: "тунец",
    foodItemNameRu: "тунец",
    priority: 61,
    variants: ["тунец", "тунца", "тунцу", "тунцом", "тунце"],
  },
  {
    key: "скумбрия",
    foodItemNameRu: "скумбрия",
    priority: 60,
    variants: ["скумбрия", "скумбрии", "скумбрию", "скумбрией"],
  },
  {
    key: "горбуша",
    foodItemNameRu: "горбуша",
    priority: 60,
    variants: ["горбуша", "горбуши", "горбушу", "горбушей"],
  },
  {
    key: "треска",
    foodItemNameRu: "треска",
    priority: 60,
    variants: ["треска", "трески", "треску", "треской"],
  },
  {
    key: "сельдь",
    foodItemNameRu: "сельдь",
    priority: 60,
    variants: ["сельдь", "сельди", "сельдью", "селедка", "селедки", "селедку"],
  },

  // ── Морепродукты (конкретные, с существующим canonical FoodItem) ──
  {
    key: "кальмар",
    foodItemNameRu: "кальмар",
    priority: 55,
    variants: ["кальмар", "кальмара", "кальмары", "кальмаров", "кальмаром"],
  },
  {
    key: "креветки",
    foodItemNameRu: "креветки",
    priority: 55,
    variants: ["креветка", "креветки", "креветку", "креветок", "креветкой"],
  },
  {
    key: "мидии",
    foodItemNameRu: "мидии",
    priority: 55,
    variants: ["мидии", "мидий", "мидиями", "мидия"],
  },
  {
    key: "краб",
    foodItemNameRu: "краб",
    priority: 55,
    variants: ["краб", "краба", "крабы", "крабом"],
  },
  {
    key: "осьминог",
    foodItemNameRu: "осьминог",
    priority: 55,
    variants: ["осьминог", "осьминога", "осьминогу", "осьминогом"],
  },
];

/** Разбивает нормализованную строку на токены по не-буквенно-цифровым символам. */
export function tokenizeKeywordInput(normalizedText: string): string[] {
  return normalizedText.split(/[^0-9a-zа-я]+/i).filter(t => t.length > 0);
}

export interface KeywordCandidateMatch {
  rule: KeywordRule;
  matchedVariant: string;
}

/**
 * Детерминированный выбор одного победителя среди всех совпавших правил:
 * 1) больше priority;
 * 2) при равенстве — forbidden-таргет выше green (targetStatuses[key]);
 * 3) при равенстве — более длинный совпавший вариант;
 * 4) финальный стабильный tie-break — лексикографически меньший key.
 */
export function pickKeywordWinner(
  candidates: KeywordCandidateMatch[],
  targetStatuses: Map<string, "green" | "forbidden">
): KeywordCandidateMatch | null {
  if (candidates.length === 0) return null;
  const statusRank = (r: KeywordRule) =>
    targetStatuses.get(normalize(r.foodItemNameRu)) === "forbidden" ? 1 : 0;
  return [...candidates].sort((a, b) => {
    if (b.rule.priority !== a.rule.priority) return b.rule.priority - a.rule.priority;
    const sr = statusRank(b.rule) - statusRank(a.rule);
    if (sr !== 0) return sr;
    if (b.matchedVariant.length !== a.matchedVariant.length) {
      return b.matchedVariant.length - a.matchedVariant.length;
    }
    return a.rule.key < b.rule.key ? -1 : a.rule.key > b.rule.key ? 1 : 0;
  })[0];
}
