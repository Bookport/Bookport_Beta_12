import { getIngredientAlias } from './ingredientAliasMapper'

export type WFPBViolationCategory =
  | 'animal'
  | 'fish_seafood'
  | 'dairy'
  | 'egg'
  | 'processed_meat'
  | 'refined_oil'
  | 'honey'
  | 'refined_sugar'
  | 'white_flour'
  | 'added_salt'

export type WFPBCheckResult = {
  compliant: boolean
  violations: WFPBViolationCategory[]
}

type ViolationRule = {
  category: WFPBViolationCategory
  keywords: string[]
  excludeIfNameContains?: string[]
}

const VIOLATION_RULES: ViolationRule[] = [
  // Meat & Poultry
  {
    category: 'animal',
    keywords: [
      'мясо', 'говядин', 'свинин', 'баранин', 'телят', 'крольчат',
      'куриц', 'курин', 'индейк', 'цыплен', 'утк', 'гус', 'индюш',
      'перепел', 'птиц',
      'стейк', 'антрекот', 'бифштекс', 'шницель',
      'желатин',
    ],
  },

  // Fish & Seafood
  {
    category: 'fish_seafood',
    keywords: [
      'рыб', 'лосос', 'ставрид', 'тунец', 'скумбр', 'селёд', 'сельд',
      'семг', 'треск', 'креветк', 'кальмар', 'миди', 'мидии', 'краб',
      'икр', 'шпрот', 'форел', 'камбал', 'палтус', 'морепродукт',
      'осьминог', 'устриц', 'лангуст', 'омаров',
    ],
  },

  // Dairy
  {
    category: 'dairy',
    keywords: [
      'молок', 'молоч', 'сыр', 'творог', 'сливк', 'сметан', 'йогурт',
      'кефир', 'ряженк', 'простокваш',
    ],
  },

  // Eggs
  {
    category: 'egg',
    keywords: ['яйц', 'яичн', 'меланж', 'омлет'],
  },

  // Processed Meat
  {
    category: 'processed_meat',
    keywords: [
      'колбас', 'сосис', 'сардельк', 'ветчин', 'бекон', 'шпик', 'фарш',
    ],
  },

  // Refined Oils – exclude whole foods containing "масл" (olives, essential oils)
  {
    category: 'refined_oil',
    keywords: ['масл', 'маргарин', 'спред', 'майонез'],
    excludeIfNameContains: ['маслин', 'эфирн'],
  },

  // Honey
  {
    category: 'honey',
    keywords: ['мёд', 'мед', 'прополис'],
  },

  // Refined sugar & syrups
  {
    category: 'refined_sugar',
    keywords: ['сахар', 'сироп'],
  },

  // White / refined flour
  {
    category: 'white_flour',
    keywords: [
      'мука пшеничная', 'пшеничная мука', 'мука в/с', 'белая мука',
      'рафинированная мука',
    ],
  },

  // Added salt – EXCEPT beans ("фасоль" contains "соль")
  {
    category: 'added_salt',
    keywords: [
      'соль', 'солен', 'солён', 'солев',
      'соевый соус', 'мисо с солью',
    ],
    excludeIfNameContains: ['фасол'],
  },
]

export function checkWFPB(ingredientName: string): WFPBCheckResult {
  const raw = ingredientName?.trim() ?? ''
  if (!raw) return { compliant: true, violations: [] }

  // Normalize via alias mapper FIRST, as recommended
  const normalized = getIngredientAlias(raw).toLowerCase().trim()

  // Always also scan the raw name in case aliasing discards a trigger
  const haystackValues: string[] = [normalized, raw.toLowerCase().trim()]

  const found = new Set<WFPBViolationCategory>()

  for (const haystack of haystackValues) {
    for (const rule of VIOLATION_RULES) {
      // Exclusion check – if any exclusion string matches, skip this rule for this haystack
      if (rule.excludeIfNameContains?.some(ex => haystack.includes(ex))) {
        continue
      }

      // Keyword match
      if (rule.keywords.some(kw => haystack.includes(kw))) {
        found.add(rule.category)
      }
    }
  }

  return {
    compliant: found.size === 0,
    violations: Array.from(found),
  }
}

export function classifyIngredient(name: string): {
  isAnimal: boolean
  isOil: boolean
  isSalt: boolean
  isSugar: boolean
} {
  const result = checkWFPB(name)
  const v = result.violations
  return {
    isAnimal: v.some(cat =>
      ['animal', 'fish_seafood', 'dairy', 'egg', 'processed_meat', 'honey'].includes(cat)
    ),
    isOil: v.includes('refined_oil'),
    isSalt: v.includes('added_salt'),
    isSugar: v.includes('refined_sugar'),
  }
}
