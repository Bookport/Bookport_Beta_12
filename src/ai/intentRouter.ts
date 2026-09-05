export type IntentCategory = 'smalltalk' | 'audit' | 'chat';

export interface RouterResult {
  category: IntentCategory;
  fastResponse?: string; // Готовый ответ для экономии токенов
  searchQuery?: string;  // Очищенный текст для поиска по базе знаний (RAG)
}

// Регулярные выражения для мгновенного перехвата рутины
const GREETINGS_REGEX = /^(привет|здравствуй|доброе утро|добрый день|добрый вечер|хей)/i;
const GRATITUDE_REGEX = /^(спасибо|благодарю|круто|понятно|супер|класс)/i;
const WHO_AM_I_REGEX = /кто ты|ты бот|ты врач/i;

/**
 * Главный роутер Анны. Определяет тип запроса до обращения к LLM.
 */
export function determineIntent(text: string, hasImage: boolean = false): RouterResult {
  // 1. Наивысший приоритет: если есть картинка — это разбор тарелки
  if (hasImage) {
    return { category: 'audit' };
  }

  // Очищаем текст от лишних пробелов для анализа
  const cleanText = text.trim().toLowerCase();
  const wordCount = cleanText.split(/\s+/).length;

  // 2. Блок Smalltalk: мгновенные ответы без API Qwen
  if (WHO_AM_I_REGEX.test(cleanText)) {
    return {
      category: 'smalltalk',
      fastResponse: 'Я Анна — твой гид по цельному растительному питанию (WFPB). Я не ставлю диагнозы и не заменяю врача, но помогу собрать сбалансированную тарелку, найти замены продуктам и разобраться в том, как еда влияет на самочувствие. Что обсудим?'
    };
  }

  // Перехватываем короткие приветствия (до 3 слов)
  if (GREETINGS_REGEX.test(cleanText) && wordCount <= 3) {
    return {
      category: 'smalltalk',
      fastResponse: 'Привет! Я на связи. Пришлешь фото тарелки на проверку или есть вопрос по питанию?'
    };
  }

  // Перехватываем короткие благодарности
  if (GRATITUDE_REGEX.test(cleanText) && wordCount <= 3) {
    return {
      category: 'smalltalk',
      fastResponse: 'Рада помочь! Если появятся новые вопросы или тарелки для разбора — обращайся.'
    };
  }

  // 3. Если это не фото и не короткая фраза — передаем в блок умного чата
  return {
    category: 'chat',
    // Очищаем запрос от пунктуации, чтобы ragService было проще искать совпадения
    searchQuery: cleanText.replace(/[.,!?]/g, '')
  };
}