// Gender-specific verb form helper (mirrors `t()` in waterPhrases/movementPhrases)
export const getGenderVerb = (gender: string | undefined, maleWord: string, femaleWord: string): string =>
  gender === "female" ? femaleWord : maleWord;

/**
 * Очищает текст Анны от дублирующихся имен пользователя.
 * Оставляет только первое упоминание, остальные аккуратно вырезает вместе с прилегающим мусором.
 */
export const cleanAnnaText = (text: string, userName: string | undefined): string => {
  if (!userName || !text) return text;
  
  // Разделяем текст по имени пользователя
  const parts = text.split(userName);
  
  // Если имя не встречается или встречается всего 1 раз — возвращаем как есть
  if (parts.length <= 2) return text;

  // Оставляем первое упоминание имени (склеиваем первую часть, имя и вторую часть)
  let result = parts[0] + userName;

  // Для всех последующих частей очищаем мусор, оставшийся от удаления имени
  for (let i = 1; i < parts.length; i++) {
    // Убираем осиротевшие пробелы/запятые/точки в начале — но НЕ переносы строк,
    // чтобы сохранить разбивку на абзацы (\n\n между блоками движка).
    let cleanedPart = parts[i].replace(/^[ \t,.]+/, '');

    // Если после очистки остался текст, добавляем его
    if (cleanedPart.length > 0) {
      // Если часть начинается с переноса строки — сохраняем абзац как есть,
      // иначе склеиваем через пробел.
      result += /^\n/.test(cleanedPart) ? cleanedPart : ' ' + cleanedPart;
    }
  }

  // Финальная зачистка: схлопываем только горизонтальные пробелы (не трогаем \n\n)
  return result.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
};
