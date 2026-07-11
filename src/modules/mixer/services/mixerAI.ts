import type { MixerIngredient, MixerScenarioType, MixerOutcomeType, MixerGeminiResult, CookingMethod } from '../types/mixer.types'
import { safeParseJSON } from '../../../utils/safeParseJSON'
import { api } from '../../../utils/api'

export interface MixedResult {
  ingredients: MixerIngredient[]
  outcomeType: MixerOutcomeType
}

const ALLOWED_LIST = [
  'авокадо', 'баклажан', 'банан', 'брокколи', 'брюссельская капуста',
  'булгур', 'горох', 'гречка', 'грибы', 'зеленый лук', 'зеленый горошек',
  'имбирь', 'кабачок', 'кале', 'капуста белокочанная', 'капуста краснокочанная',
  'картофель', 'киноа', 'кукуруза', 'кунжут', 'лук репчатый', 'мангольд',
  'мандарин', 'манго', 'маш', 'микрозелень', 'миндаль', 'морковь', 'нут',
  'овсянка', 'огурец', 'петрушка', 'помидор', 'редис', 'рис бурый',
  'руккола', 'свекла', 'сельдерей', 'семена льна', 'соевый соус',
  'спаржа', 'тофу', 'тыква', 'укроп', 'фасоль', 'финики', 'хлеб цельнозерновой',
  'цветная капуста', 'чечевица', 'чеснок', 'шпинат', 'яблоко',
]

const FORBIDDEN_LIST = [
  'бекон', 'говядина', 'свинина', 'баранина', 'курица', 'индейка', 'утка',
  'лосось', 'семга', 'форель', 'тунец', 'креветки', 'кальмары', 'мидии',
  'яйцо', 'молоко', 'сливки', 'сметана', 'творог', 'сыр', 'майонез',
  'сливочное масло', 'растительное масло', 'шоколад', 'сахар', 'соль',
  'белая мука', 'белый хлеб', 'консервы', 'колбаса', 'сосиски', 'фарш мясной',
  'мед', 'варенье', 'мороженое', 'печенье', 'пирожное', 'торт',
  'кетчуп', 'газировка', 'чипсы', 'попкорн', 'сухарики',
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom<T>(arr: T[], count: number, exclude: Set<string> = new Set()): T[] {
  const pool = shuffle(arr).filter((item) => !exclude.has(String(item)))
  return pool.slice(0, count)
}

export function selectIngredients(scenarioType: MixerScenarioType): MixedResult {
  const selected: MixerIngredient[] = []
  const usedNames = new Set<string>()

  if (scenarioType === 'positive') {
    const picks = pickRandom(ALLOWED_LIST, 4, usedNames)
    for (const name of picks) {
      usedNames.add(name)
      selected.push({ name, isForbidden: false, image: null })
    }
    return { ingredients: selected, outcomeType: 'A' }
  }

  let outcomeType: MixerOutcomeType = 'A'
  for (let i = 0; i < 4; i++) {
    const useForbidden = Math.random() < 0.4
    let name: string
    if (useForbidden) {
      const pool = FORBIDDEN_LIST.filter((f) => !usedNames.has(f))
      if (pool.length > 0) {
        name = pool[Math.floor(Math.random() * pool.length)]
      } else {
        name = pickRandom(ALLOWED_LIST, 1, usedNames)[0] as string
      }
    } else {
      name = pickRandom(ALLOWED_LIST, 1, usedNames)[0] as string
    }
    usedNames.add(name)
    selected.push({ name, isForbidden: useForbidden, image: null })
  }

  const hasForbidden = selected.some((s) => s.isForbidden)
  const allAllowed = selected.every((s) => !s.isForbidden)
  if (hasForbidden) outcomeType = 'B'
  else if (allAllowed) outcomeType = 'C'

  return { ingredients: selected, outcomeType }
}

export function getPoolForReel(scenarioType: MixerScenarioType): string[] {
  const pool = scenarioType === 'positive' ? [...ALLOWED_LIST] : [...ALLOWED_LIST, ...FORBIDDEN_LIST]
  return shuffle(pool)
}

// --- Mixer-specific: single Gemini call for full result ---

const KBJU_MULTIPLIERS: Record<CookingMethod, { calories: number; fat: number; protein: number; carbs: number }> = {
  fry: { calories: 1.3, fat: 1.5, protein: 1.0, carbs: 1.0 },
  braise: { calories: 1.0, fat: 1.0, protein: 1.0, carbs: 1.0 },
  boil: { calories: 0.85, fat: 0.7, protein: 1.0, carbs: 1.0 },
}

const COOKING_METHOD_RU: Record<CookingMethod, string> = {
  fry: 'жарка',
  braise: 'тушение',
  boil: 'варка',
}

export function applyKbjuMultipliers(
  nutrients: { calories: number; protein: number; fat: number; carbs: number; fiber: number },
  method: CookingMethod,
): { calories: number; protein: number; fat: number; carbs: number; fiber: number } {
  const m = KBJU_MULTIPLIERS[method]
  return {
    calories: Math.round(nutrients.calories * m.calories),
    protein: Math.round(nutrients.protein * m.protein),
    fat: Math.round(nutrients.fat * m.fat),
    carbs: Math.round(nutrients.carbs * m.carbs),
    fiber: nutrients.fiber,
  }
}

function buildGeminiPrompt(params: {
  ingredients: MixerIngredient[]
  outcomeType: MixerOutcomeType
  scenarioType: MixerScenarioType
  userGender: 'male' | 'female' | null
  chargeLevel: number
  cookingMethod: CookingMethod
  achievementName: string
  achievementCategory: string
}): string {
  const ingredientsDesc = params.ingredients
    .map((i) => `${i.name}${i.isForbidden ? ' (запрещённый продукт)' : ''}`)
    .join(', ')

  const outcomeDescriptions: Record<MixerOutcomeType, string> = {
    A: 'ВСЁ ЧИСТО — все продукты разрешённые WFPB. Никаких биологических страшилок, только тёплая похвала.',
    B: 'ЕСТЬ НАРУШЕНИЯ — в списке есть запрещённые продукты. Анна недовольна, использует биологические факты для каждого нарушителя.',
    C: 'ЧИСТО + ВЕЗЕНИЕ — все продукты чистые, но сценарий негативный. Анна удивлена, затем тепло хвалит.',
  }

  const genderInstruction = params.userGender === 'male'
    ? 'Пользователь мужского пола — используй мужские формы глаголов.'
    : params.userGender === 'female'
      ? 'Пользователь женского пола — используй женские формы глаголов.'
      : 'Обращение в нейтральном роде.'

  return [
    'Ты — генератор данных для игрового режима «Миксер» в приложении ЗОЖ.',
    'Отвечай ТОЛЬКО валидным JSON без markdown, без пояснений, без кодовых блоков.',
    'Никаких обёрток — только сам JSON-объект.',
    '',
    'Требуемая структура JSON:',
    JSON.stringify({
      dishName: 'креативное русское название блюда из этих продуктов (2-5 слов, без эмодзи, без кавычек)',
      phase1: {
        text: 'Анна рассматривает ингредиенты — 2-3 коротких предложения. Реакция на КОНКРЕТНЫЕ продукты. Без «Подождите» или «Загружаю».',
        emotion: 'одно слово: curious / playful / suspicious / mock_horror / thoughtful',
        intensity: 'число от 1 до 5',
      },
      nutrition: {
        calories: 'число ккал на 100г',
        protein: 'число грамм',
        fat: 'число грамм',
        carbs: 'число грамм',
        fiber: 'число грамм',
      },
      micronutrients: [
        { name: 'название микронутриента', value: 'значение с единицей измерения', level: 'good / moderate / high' },
      ],
      phase2: {
        text: 'Анна комментирует результат. 4-6 предложений. Называет блюдо по имени. Упоминает 1-2 нутриента. Эмоция соответствует исходу. Завершает мотивацией или вызовом.',
        emotion: 'одно слово: happy / proud / sarcastic / mock_horror / surprised / warm',
        intensity: 'число от 1 до 5',
      },
    }, null, 2),
    '',
    'Данные для генерации:',
    `- Ингредиенты: ${ingredientsDesc}`,
    `- Сценарий: ${params.scenarioType}`,
    `- Исход: ${outcomeDescriptions[params.outcomeType]}`,
    `- Заряд рычага: ${params.chargeLevel.toFixed(1)} секунд (чем дольше, тем «мощнее» результат)`,
    `- Способ приготовления: ${COOKING_METHOD_RU[params.cookingMethod]} (${params.cookingMethod})`,
    `- Название достижения-источника: ${params.achievementName}`,
    `- Категория достижения: ${params.achievementCategory}`,
    `- ${genderInstruction}`,
    '',
    'КРИТИЧЕСКОЕ ПРАВИЛО: И phase1, И phase2.text говорят ТОЛЬКО о тех ингредиентах, которые перечислены в блоке «Ингредиенты» выше. Никаких других продуктов, специй, приправ, гарниров, масел, соусов, зелени, добавок. Список ингредиентов финальный и неизменный — в нём ровно те продукты, что выпали в центральной линии игрового автомата. Анна не додумывает и не предполагает дополнительные ингредиенты.',
    '',
    'Правила для phase1.text:',
    '- Анна только что увидела эти продукты. Она разглядывает их с любопытством.',
    '- Для исхода B: игривая подозрительность, «я слежу за тобой» тон.',
    '- Для исходов A и C: тёплое любопытство, предвкушение.',
    '- 2-3 предложения максимум.',
    '- Упоминай 1-2 конкретных продукта из списка выше. Не придумывай свои.',
    '',
    'Правила для dishName:',
    '- Креативное, весёлое название, как у умного шеф-повара.',
    '- На русском, 2-6 слов, без эмодзи, без кавычек.',
    `- Название ОБЯЗАТЕЛЬНО должно естественным образом отражать способ приготовления (${COOKING_METHOD_RU[params.cookingMethod]}). Примеры: «Жареный хаос с капустой в панике», «Тушёное недоразумение с оптимизмом», «Варёная нежность с котлетой».`,
    '',
    'Правила для nutrition:',
    '- Осмысленные значения, соответствующие ингредиентам.',
    '- На 100 грамм блюда.',
    '- Если есть запрещённые продукты — калории и жиры выше.',
    '',
    'Правила для phase2.text:',
    '- 4-6 предложений.',
    '- Называет блюдо по имени.',
    '- Комментирует 1-2 конкретных нутриента.',
    `- Анна ОБЯЗАТЕЛЬНО ссылается на способ приготовления (${COOKING_METHOD_RU[params.cookingMethod]}) и его влияние на блюдо: для жарки — «обжарка добавила характер и немного лишних калорий», для тушения — «тушение сохранило всё как есть», для варки — «варка облагородила состав и сбросила лишнее».`,
    '- Анна знает название и тему достижения, которое вызвало этот миксер. Если тема достижения органично вписывается в комментарий о блюде — она МОЖЕТ упомянуть его, но только если это звучит естественно. Никогда не форсировать упоминание.',
    '- Анна использует ту же логику и лексикон, что и во всём приложении: чистые блюда — хвалит, с нарушениями — ругает используя биологические факты.',
    '- Завершает мотивацией или лёгким вызовом.',
    '- ЖЁСТКОЕ ПРАВИЛО: phase2.text — строго о блюде из ингредиентов, перечисленных выше. Анна называет эти ингредиенты по именам. Она НЕ упоминает продукты, которых нет в этом списке. Запрещено: «посыпь зеленью», «добавь специи», «с гарниром из овощей», «подавай с соусом», «приправь» и любые другие отсылки к несуществующим ингредиентам.',
    '- Анна комментирует только после того, как ей стал известен полный состав блюда.',
    '- Запрещено вставлять продукты из phase1, которых нет в финальном списке.',
    '',
    'ТОН В ЗАВИСИМОСТИ ОТ ИСХОДА:',
    '- Исход A (ВСЁ ЧИСТО): Анна рада. Тёплая похвала, уважение за выбор, мотивация продолжать. Никакой биологии и ужасов. Тон happy/proud/warm.',
    '- Исход C (ЧИСТО + ВЕЗЕНИЕ): Анна удивлена, затем тепло хвалит. Упоминает, что пользователю повезло. Тон surprised/happy.',
    '- Исход B (ЕСТЬ ЗАПРЕЩЁННЫЕ): Анна недовольна. Использует биологические факты КОНКРЕТНО для каждого запрещённого продукта:',
    '  — Мясо/птица (говядина, курица, свинина и т.д.): IGF-1, нагрузка на почки, TMAO разрушает сосуды.',
    '  — Молочка (сыр, молоко, масло и т.д.): казоморфины (зависимость), эстрогены, соматические клетки (гной).',
    '  — Яйца: холестерин, TMAO, нагрузка на печень.',
    '  — Рыба/морепродукты (лосось, креветки и т.д.): микропластик, тяжёлые металлы, ртуть.',
    '  — Колбасы/бекон/фастфуд: канцерогены (группа 1 ВОЗ), нитрит натрия, «бальзамирует организм».',
    '  — Масла/соусы (майонез, сливочное масло): трансжиры, эндотелий, чистая жировая бомба.',
    '  — Сахар/выпечка/сладкое: инсулиновые скачки, гликация (старение), патогенная микрофлора.',
    '  — Алкоголь/газировка: нейротоксины, обезвоживание, разрушение мозга.',
    '- Для исходов A/B/C назови блюдо по имени. Для A/C — с гордостью и теплом, для B — с иронией.',
    '- Важно: если запрещённых продуктов нет (A, C) — только тёплая похвала, никаких биологических страшилок.',
    '',
    'Правила для micronutrients (3-4 элемента):',
    '- Клетчатка — всегда good.',
    '- Остальные: железо, магний, калий, кальций, цинк, витамин C и т.д.',
    '- Реалистичные значения для растительных продуктов.',
    '- level: good — если много, moderate — если средне, high — если избыток.',
  ].join('\n')
}

function parseGeminiResponse(raw: string): MixerGeminiResult | null {
  const { data: parsed, ok } = safeParseJSON(raw, null)
  if (!ok) return null

    return {
      dishName: String(parsed.dishName || 'Микс-микс').trim().replace(/^(\s*)(.)/, (_, s, c) => s + c.toUpperCase()),
      phase1: {
        text: String(parsed.phase1?.text || parsed.phase1_text || 'Очень интересная комбинация...'),
        emotion: String(parsed.phase1?.emotion || 'curious'),
        intensity: Number(parsed.phase1?.intensity) || 2,
      },
      nutrition: {
        calories: Number(parsed.nutrition?.calories || parsed.calories || 200),
        protein: Number(parsed.nutrition?.protein || parsed.protein || 10),
        fat: Number(parsed.nutrition?.fat || parsed.fat || 5),
        carbs: Number(parsed.nutrition?.carbs || parsed.carbs || 20),
        fiber: Number(parsed.nutrition?.fiber || parsed.fiber || 5),
      },
      micronutrients: Array.isArray(parsed.micronutrients)
        ? parsed.micronutrients.slice(0, 4).map((m: any) => ({
            name: String(m.name || ''),
            value: String(m.value || ''),
            level: (['good', 'moderate', 'high'].includes(m.level) ? m.level : 'good') as 'good' | 'moderate' | 'high',
          }))
        : [
            { name: 'Клетчатка', value: `${Math.floor(Math.random() * 10 + 5)} г`, level: 'good' as const },
            { name: 'Железо', value: `${Math.floor(Math.random() * 4 + 1)} мг`, level: 'moderate' as const },
            { name: 'Магний', value: `${Math.floor(Math.random() * 60 + 20)} мг`, level: 'good' as const },
          ],
      phase2: {
        text: String(parsed.phase2?.text || parsed.phase2_text || 'Вот такой получился результат!'),
        emotion: String(parsed.phase2?.emotion || 'happy'),
        intensity: Number(parsed.phase2?.intensity) || 3,
      },
    }
}

export async function generateMixerResult(params: {
  ingredients: MixerIngredient[]
  outcomeType: MixerOutcomeType
  scenarioType: MixerScenarioType
  userGender: 'male' | 'female' | null
  chargeLevel: number
  cookingMethod: CookingMethod
  achievementName: string
  achievementCategory: string
}): Promise<MixerGeminiResult> {
  const prompt = buildGeminiPrompt(params)

  try {
    const data = await api<any>('/api/anna-chat', {
      method: 'POST',
      body: {
        message: prompt,
        history: [],
        screenContext: 'mixer_gemini_json',
      },
    })
    const reply: string = data.reply || ''
    let parsed = parseGeminiResponse(reply)
    if (!parsed) {
      // Retry once with strict instruction
      const retryData = await api<any>('/api/anna-chat', {
        method: 'POST',
        body: {
          message: prompt + '\n\nВНИМАНИЕ: твой предыдущий ответ был невалидным. Сгенерируй ответ заново. Верни СТРОГО валидный JSON без markdown, текста и комментариев. Только JSON.',
          history: [],
          screenContext: 'mixer_gemini_json',
        },
      })
      parsed = parseGeminiResponse(retryData.reply || '')
    }
    if (parsed) {
      const adjusted = applyKbjuMultipliers(parsed.nutrition, params.cookingMethod)
      return {
        ...parsed,
        nutrition: adjusted,
      }
    }
  } catch {
    // fall through to fallback
  }

  // Fallback
  const forbiddenNames = params.ingredients.filter((i) => i.isForbidden).map((i) => i.name)
  const hasForbidden = forbiddenNames.length > 0
  const isLucky = params.outcomeType === 'C'
  const cookRu = COOKING_METHOD_RU[params.cookingMethod]

  return {
    dishName: ('Микс-микс').replace(/^(\s*)(.)/, (_, s, c) => s + c.toUpperCase()),
    phase1: {
      text: hasForbidden
        ? 'Ого, я смотрю на эти продукты и чувствую подвох... Кажется, кто-то решил испытать судьбу!'
        : 'Интересный набор продуктов! Уже представляю, что из этого может получиться...',
      emotion: hasForbidden ? 'suspicious' : 'curious',
      intensity: 2,
    },
    nutrition: applyKbjuMultipliers({ calories: 200, protein: 10, fat: 5, carbs: 20, fiber: 8 }, params.cookingMethod),
    micronutrients: [
      { name: 'Клетчатка', value: '8 г', level: 'good' as const },
      { name: 'Железо', value: '3 мг', level: 'moderate' as const },
      { name: 'Магний', value: '45 мг', level: 'good' as const },
    ],
    phase2: {
      text: isLucky
        ? `Ну надо же! Я ожидала худшего, но всё оказалось в рамках дозволенного! ${cookRu} пошла на пользу — состав радует. Тебе определённо везёт сегодня. Так держать!`
        : hasForbidden
          ? `Ну что ж, детектор WFPB сработал! Запрещённые продукты пробрались в микс, ну а ${cookRu} — так себе оправдание. Главное — ты теперь знаешь состав и можешь выбрать альтернативу. В следующий раз повезёт больше!`
          : `Вот это результат! Все ингредиенты — pure WFPB, и нутриенты радуют глаз. Особенно впечатляет клетчатка — твой кишечник скажет спасибо! ${cookRu} сделала своё дело. Продолжай в том же духе!`,
      emotion: isLucky ? 'surprised' : hasForbidden ? 'sarcastic' : 'happy',
      intensity: 3,
    },
  }
}

// --- Legacy functions kept for God Mode panel ---

export async function generateDishName(ingredients: MixerIngredient[]): Promise<string> {
  const names = ingredients.map((i) => i.name).join(', ')
  try {
    const data = await api<any>('/api/anna-chat', {
      method: 'POST',
      body: {
        message: `Придумай креативное, весёлое название блюда из этих продуктов: ${names}. Это для приложения ЗОЖ. Стиль: как умный шеф-повар придумывает для своего меню — тепло, слегка абсурдно, со вкусом. Название на русском, 2-5 слов, без кавычек и эмодзи. Только название, без пояснений.`,
        history: [],
        screenContext: 'mixer',
      },
    })
    return data.reply?.trim() || 'Микс-микс'
  } catch {
    return 'Микс-микс'
  }
}

export async function generateAnnaSpeech(
  phase: 'waiting' | 'result',
  params: {
    ingredients: MixerIngredient[]
    dishName?: string
    outcomeType: MixerOutcomeType
    scenarioType: MixerScenarioType
    userGender: 'male' | 'female' | null
    nutrientsSummary?: string
    chargeLevel?: number
  },
): Promise<string> {
  const ingredientDesc = params.ingredients
    .map((i) => `${i.name}${i.isForbidden ? ' (запрещённый)' : ''}`)
    .join(', ')

  const forbiddenNames = params.ingredients.filter((i) => i.isForbidden).map((i) => i.name).join(', ')

  let prompt: string
  if (phase === 'waiting') {
    prompt = [
      `Ты Анна — весёлый, умный нутрициолог-куратор в приложении ЗОЖ.`,
      `Пользователь${params.userGender === 'male' ? '' : 'ка'} только что дёрнул${params.userGender === 'male' ? '' : 'ла'} рычаг «Миксера» и получил${params.userGender === 'male' ? '' : 'ла'} набор продуктов: ${ingredientDesc}.`,
      params.chargeLevel && params.chargeLevel >= 5 ? `Заряд рычага был мощным: ${Math.round(params.chargeLevel)} секунд! Пользователь вложил${params.userGender === 'male' ? '' : 'ла'} много энергии.` : '',
      `Напиши ровно 2-3 коротких предложения. Отреагируй на КОНКРЕТНЫЕ продукты — разглядываешь их с любопытством.`,
      `Без фраз «Подождите», «Загружаю», «Секунду».`,
      params.outcomeType === 'B'
        ? `Тон: игриво-подозрительный, ты уже заметила подозрительные ингредиенты и примеряешь роль строгого судьи. Театральное приподнимание брови.`
        : `Тон: тёплое любопытство, интересная комбинация, предвкушение.`,
      params.userGender === 'male' ? 'Обращайся к пользователю в мужском роде.' : params.userGender === 'female' ? 'Обращайся к пользователю в женском роде.' : '',
    ].join(' ')
  } else {
    prompt = [
      `Ты Анна — весёлый, умный нутрициолог-куратор в приложении ЗОЖ.`,
      `Результат «Миксера»: блюдо «${params.dishName || 'неизвестно'}» из продуктов: ${ingredientDesc}.`,
      params.nutrientsSummary ? `Нутриенты: ${params.nutrientsSummary}.` : '',
      params.outcomeType === 'A'
        ? `Исход: ПОЗИТИВНЫЙ — все продукты разрешённые. Отпразднуй это тепло и с энтузиазмом! Назови блюдо по имени с восторгом. Выдели 1-2 впечатляющих нутриента. 4-6 предложений. Закончи мотивацией продолжать путь. Юмор уместен.`
        : params.outcomeType === 'B'
          ? `Исход: НЕГАТИВНЫЙ — есть запрещённые продукты: ${forbiddenNames}. Ты — добродушно-саркастичный судья. С театральным ужасом укажи на «нарушителей», но добавь реальный нутритивный комментарий по полезным ингредиентам. Не унижай — весели. Пользователь должен улыбнуться, не чувствовать стыда. 4-6 предложений.`
          : `Исход: НЕГАТИВНЫЙ СЦЕНАРИЙ, НО ВСЕ ПРОДУКТЫ РАЗРЕШЁННЫЕ. Ты ОЧЕНЬ удивлена — ожидала худшего! Обязательно скажи, что удача на стороне пользователя и это путь к искуплению. Тёплый, ободряющий тон. 4-6 предложений.`,
      params.userGender === 'male' ? 'Обращайся к пользователю в мужском роде.' : params.userGender === 'female' ? 'Обращайся к пользователю в женском роде.' : '',
    ].join(' ')
  }

  try {
    const data = await api<any>('/api/anna-chat', {
      method: 'POST',
      body: {
        message: prompt,
        history: [],
        screenContext: 'mixer',
      },
    })
    return data.reply?.trim() || (phase === 'waiting' ? 'Очень интересная комбинация...' : 'Вот такой получился результат!')
  } catch {
    return phase === 'waiting'
      ? 'Очень интересная комбинация...'
      : 'Вот такой получился результат!'
  }
}
