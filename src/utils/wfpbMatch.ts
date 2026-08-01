const CYRILLIC_LETTER = /[а-яё]/;

export function normalizeForMatch(text: string): string {
  return (text || "").toLowerCase().replace(/ё/g, "е").trim();
}

// Слова, которые НЕЛЬЗЯ трактовать по корню как запрещённый продукт,
// даже если они начинаются с «опасного» стема:
//  - «сыр»   : сырые овощи/фрукты, «сырьё», «сыровар»
//  - «сельд» : «сельдерей» (это овощ, а не селёдка!)
//  - «мед»   : «медвежий», «медь»
//  - «печен» : «печёный» (запечённый, не печень)
//  - «морожен»: «заморожен.» (сокращение, не мороженое)
//  - «вин»   : «винный уксус» (это уксус, не вино)
const WORD_EXCEPTIONS: ReadonlySet<string> = new Set<string>([
  "сырой",
  "сырая",
  "сырое",
  "сырые",
  "сырость",
  "сыроватый",
  "сыроватая",
  "сыроватое",
  "сыроватые",
  "сырье",
  "сыровар",
  "сыроварня",
  "сельдерей",
  "сельдерея",
  "сельдерею",
  "сельдереем",
  "сельдерее",
  "сельдерейный",
  "сельдерейная",
  "сельдерейное",
  "сельдерейные",
  "медвежий",
  "медвежья",
  "медвежье",
  "медвежьи",
  "медь",
  "печеный",
  "печеная",
  "печеное",
  "печеные",
  "морожен",
  "винный",
  "винная",
  "винное",
  "винные",
]);

export function isWordException(word: string): boolean {
  return WORD_EXCEPTIONS.has(normalizeForMatch(word));
}

// Расширяет фрагмент [start, start+length) до границ кириллического слова.
export function expandWordAt(text: string, start: number, length: number): string {
  let begin = start;
  while (begin > 0 && CYRILLIC_LETTER.test(text[begin - 1])) begin -= 1;
  let end = start + length;
  while (end < text.length && CYRILLIC_LETTER.test(text[end])) end += 1;
  return text.slice(begin, end);
}

// Стем матчится ТОЛЬКО от начала слова (граница слева), с любой флексией после,
// но НЕ для слов из WORD_EXCEPTIONS. Многословные фразы («мука пшеничная»)
// матчатся как подстрока — они однозначны и длинны.
export function containsStemWithBoundaries(haystack: string, stem: string): boolean {
  const h = normalizeForMatch(haystack);
  const s = normalizeForMatch(stem);
  if (!h || !s) return false;

  if (/\s/.test(s)) {
    return h.includes(s);
  }

  const words = h.split(/[^а-я]+/);
  for (const w of words) {
    if (!w) continue;
    if (w.startsWith(s) && !WORD_EXCEPTIONS.has(w)) return true;
  }
  return false;
}

export interface WFPBDbItem {
  nameRu: string;
  wfpbStatus: string;
}

// Авторитетный статус из БД: точное совпадение по nameRu (без учёта регистра и «ё»).
// Возвращает null, если продукта нет в базе — тогда применяются текстовые эвристики.
export function matchDBStatus(name: string, dbItems: WFPBDbItem[]): string | null {
  if (!dbItems || dbItems.length === 0) return null;
  const n = normalizeForMatch(name);
  if (!n) return null;
  const hit = dbItems.find((i) => normalizeForMatch(i.nameRu) === n);
  return hit ? hit.wfpbStatus : null;
}
