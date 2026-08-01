import { getIngredientAlias } from './ingredientAliasMapper'
import { containsStemWithBoundaries } from './wfpbMatch'

export type WFPBViolationCategory =
  | 'animal'
  | 'fish_seafood'
  | 'dairy'
  | 'egg'
  | 'processed_meat'
  | 'refined_oil'
  | 'honey'
  | 'refined_sugar'
  | 'refined_grains'
  | 'added_salt'
  | 'alcohol'
  | 'processed_foods'

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
      'мясо', 'говядин', 'свинин', 'баранин', 'телят', 'ягнят',
      'кролик', 'крольчат',
      'конин', 'оленин',
      'куриц', 'курин', 'индейк', 'цыплен', 'утк', 'гус', 'индюш',
      'перепел', 'цесарк', 'страус', 'птиц',
      'печен', 'сердц', 'язык', 'почк', 'желудк',
      'стейк', 'антрекот', 'бифштекс', 'шницель',
      'желатин',
    ],
    excludeIfNameContains: ['соев'],
  },

  // Fish & Seafood
  {
    category: 'fish_seafood',
    keywords: [
      'рыб', 'лосос', 'ставрид', 'тунец', 'скумбр', 'селёд', 'сельд',
      'семг', 'треск', 'минтай', 'горбуш', 'кета', 'хек', 'судак',
      'щук', 'карп', 'карас', 'лещ', 'сом', 'осетр', 'стерляд',
      'угор', 'сайр', 'кильк', 'анчоус',
      'креветк', 'кальмар', 'миди', 'мидии', 'краб',
      'икра', 'шпрот', 'форел', 'камбал', 'палтус', 'морепродукт',
      'осьминог', 'устриц', 'лангуст', 'лобстер', 'омаров',
      'гребешк',
    ],
  },

  // Dairy
  {
    category: 'dairy',
    keywords: [
      'молок', 'молоч', 'сыр', 'творог', 'сливк', 'сливочн', 'сметан', 'йогурт',
      'кефир', 'ряженк', 'простокваш', 'варенец',
      'морожен', 'сгущенк',
      'топлен', 'гхи',
      'сывороточн',
    ],
    excludeIfNameContains: ['растительн', 'соев', 'кедров', 'маков', 'кокос', 'веганск', 'миндальн'],
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
      'сало', 'паштет', 'карбонад', 'грудинк', 'буженин', 'шпикачк',
    ],
    excludeIfNameContains: ['веганск', 'соев'],
  },

  // Refined Oils & cooking fats
  {
    category: 'refined_oil',
    keywords: ['масл', 'маргарин', 'спред', 'майонез', 'кулинарн'],
    excludeIfNameContains: ['маслин', 'эфирн'],
  },

  // Honey
  {
    category: 'honey',
    keywords: ['мёд', 'мед', 'прополис'],
    excludeIfNameContains: ['финик', 'медж'],
  },

  // Refined sugar, syrups & sweeteners
  {
    category: 'refined_sugar',
    keywords: ['сахар', 'сироп', 'фруктоз', 'аспартам', 'сукралоз', 'сахарозаменител', 'стеви'],
  },

  // Refined grains – exclude whole-grain variants
  {
    category: 'refined_grains',
    keywords: [
      'мука пшеничная', 'пшеничная мука', 'мука в/с', 'белая мука',
      'рафинированная мука',
      'мука блинн',
      'хлеб бел', 'батон', 'макарон',
    ],
    excludeIfNameContains: ['цельнозернов', 'цельн', 'полб', 'нут', 'чечевиц', 'гречнев', 'бобов'],
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

  // Alcohol
  {
    category: 'alcohol',
    keywords: ['алкогол', 'пив', 'вин', 'водк'],
    excludeIfNameContains: ['виноград'],
  },

  // Processed foods (juices, sodas, isolates, fastfood & snacks)
  {
    category: 'processed_foods',
    keywords: [
      'осветлен', 'восстановлен', 'лимонад', 'кола', 'изолят',
      'бургер', 'фри', 'наггетс', 'хот-дог', 'чебурек', 'шаурм', 'пицц',
      'чипс', 'крекер', 'энергетик', 'газировк', 'кетчуп',
      'bbq соус', 'барбекю',
    ],
  },
]

export function checkWFPB(ingredientName: string): WFPBCheckResult {
  const raw = ingredientName?.trim() ?? ''
  if (!raw) return { compliant: true, violations: [] }

  // Normalize via alias mapper FIRST, as recommended
  const normalized = getIngredientAlias(raw).toLowerCase().trim()

  const rawLower = raw.toLowerCase().trim()
  // Aliased name (normalized) + raw: keywords match any, exclusions check only raw
  const haystackValues: string[] = [normalized, rawLower]

  const found = new Set<WFPBViolationCategory>()

  for (const rule of VIOLATION_RULES) {
    // Exclusions against raw name only (avoids alias-context pollution)
    if (rule.excludeIfNameContains?.some(ex => rawLower.includes(ex))) {
      continue
    }

    // Keyword match across any haystack (word-boundary-aware, Cyrillic)
    for (const haystack of haystackValues) {
      if (rule.keywords.some(kw => containsStemWithBoundaries(haystack, kw))) {
        found.add(rule.category)
        break
      }
    }
  }

  return {
    compliant: found.size === 0,
    violations: Array.from(found),
  }
}

export function classifyIngredient(name: string): {
  isForbidden: boolean
} {
  const result = checkWFPB(name)
  return { isForbidden: result.violations.length > 0 }
}
