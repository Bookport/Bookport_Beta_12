export const ALL_CATEGORY_FILTER = '__all_categories__'

export const CATEGORIES: string[] = [
  'Анна и ты',
  'Гидрация',
  'Дисциплина',
  'Ежедневные',
  'Злодей',
  'Знаток',
  'Мастерство',
  'Первые шаги',
  'Питание',
  'Показатели',
  'Секретные',
  'Сон',
  'Социальный',
  'Активность',
]

export const CATEGORY_FILTER_LABELS: { value: string; label: string }[] = [
  { value: ALL_CATEGORY_FILTER, label: 'Все' },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
]

export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; tabBg: string; tabBorder: string }> = {
  'Анна и ты':   { bg: 'bg-rose-50',        border: 'border-rose-200',     text: 'text-rose-700',     tabBg: 'bg-rose-500',     tabBorder: 'border-rose-500' },
  'Гидрация':    { bg: 'bg-sky-50',          border: 'border-sky-200',      text: 'text-sky-700',      tabBg: 'bg-sky-500',      tabBorder: 'border-sky-500' },
  'Дисциплина':  { bg: 'bg-amber-50',        border: 'border-amber-200',    text: 'text-amber-700',    tabBg: 'bg-amber-500',    tabBorder: 'border-amber-500' },
  'Ежедневные':  { bg: 'bg-teal-50',         border: 'border-teal-200',     text: 'text-teal-700',     tabBg: 'bg-teal-500',     tabBorder: 'border-teal-500' },
  'Злодей':      { bg: 'bg-fuchsia-50',      border: 'border-fuchsia-200',  text: 'text-fuchsia-700',  tabBg: 'bg-fuchsia-500',  tabBorder: 'border-fuchsia-500' },
  'Знаток':      { bg: 'bg-indigo-50',       border: 'border-indigo-200',   text: 'text-indigo-700',   tabBg: 'bg-indigo-500',   tabBorder: 'border-indigo-500' },
  'Мастерство':  { bg: 'bg-yellow-50',       border: 'border-yellow-200',   text: 'text-yellow-700',   tabBg: 'bg-yellow-500',   tabBorder: 'border-yellow-500' },
  'Первые шаги': { bg: 'bg-emerald-50',      border: 'border-emerald-200',  text: 'text-emerald-700',  tabBg: 'bg-emerald-500',  tabBorder: 'border-emerald-500' },
  'Питание':     { bg: 'bg-lime-50',         border: 'border-lime-200',     text: 'text-lime-700',     tabBg: 'bg-lime-500',     tabBorder: 'border-lime-500' },
  'Показатели':  { bg: 'bg-cyan-50',         border: 'border-cyan-200',     text: 'text-cyan-700',     tabBg: 'bg-cyan-500',     tabBorder: 'border-cyan-500' },
  'Секретные':   { bg: 'bg-violet-50',       border: 'border-violet-200',   text: 'text-violet-700',   tabBg: 'bg-violet-500',   tabBorder: 'border-violet-500' },
  'Сон':         { bg: 'bg-slate-50',        border: 'border-slate-200',    text: 'text-slate-700',    tabBg: 'bg-slate-500',    tabBorder: 'border-slate-500' },
  'Социальный':  { bg: 'bg-pink-50',         border: 'border-pink-200',     text: 'text-pink-700',     tabBg: 'bg-pink-500',     tabBorder: 'border-pink-500' },
  'Активность':  { bg: 'bg-orange-50',       border: 'border-orange-200',   text: 'text-orange-700',   tabBg: 'bg-orange-500',   tabBorder: 'border-orange-500' },
}

export const ALL_CATEGORY_COLORS = {
  bg: 'bg-zinc-50',
  border: 'border-zinc-200',
  text: 'text-zinc-700',
  tabBg: 'bg-zinc-800',
  tabBorder: 'border-zinc-800',
}

export const ALL_RARITY_FILTER = '__all_rarities__'

export const RARITY_FILTER_LABELS: { value: string; label: string; color: string }[] = [
  { value: ALL_RARITY_FILTER, label: 'Все' },
  { value: 'Обычная', label: 'Обычная' },
  { value: 'Необычная', label: 'Необычная' },
  { value: 'Редкая', label: 'Редкая' },
  { value: 'Эпическая', label: 'Эпическая' },
  { value: 'Легендарная', label: 'Легендарная' },
].map((item) => ({
  ...item,
  color: item.value === '__all_rarities__' ? 'slate' : item.value === 'Обычная' ? 'zinc' : item.value === 'Необычная' ? 'emerald' : item.value === 'Редкая' ? 'sky' : item.value === 'Эпическая' ? 'violet' : 'amber',
}))
