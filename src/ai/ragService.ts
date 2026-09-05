import chatKnowledge from './chatKnowledge.json';
import auditKnowledge from './auditKnowledge.json';

// Интерфейсы для строгой типизации наших баз V2
export interface ChatKnowledgeCard {
  id: string;
  intent_tags: string[];
  claim: { text: string };
  practical_actions: string[];
  safety: {
    medical_sensitive: boolean;
    escalation: string;
  };
  answer_rules: {
    avoid_phrases: string[];
  };
}

export interface AuditKnowledgeCard {
  id: string;
  ingredient_tags: string[];
  assessment: string;
  replacement_by_function: string[];
  avoid: string[];
}

/**
 * Ищет релевантную карточку для обычного текстового чата (ЖКТ, нутриенты, сон)
 */
export function searchChatKnowledge(searchQuery: string): string | null {
  const words = searchQuery.toLowerCase().split(/\s+/);
  
  let bestMatch: ChatKnowledgeCard | null = null;
  let maxScore = 0;

  // Ищем наибольшее совпадение по тегам
  const cards = chatKnowledge.wfpb_chat_knowledge as ChatKnowledgeCard[];
  for (const card of cards) {
    let score = 0;
    for (const tag of card.intent_tags) {
      // Учитываем частичные совпадения (например, "вздути" найдет "вздутие")
      if (words.some(word => word.includes(tag) || tag.includes(word))) {
        score++;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = card;
    }
  }

  // Если ничего не нашли, возвращаем null (Анна ответит на основе базового промпта)
  if (!bestMatch) return null;

  // Склеиваем безопасный контекст для Qwen
  let contextString = `[СИСТЕМНЫЙ ФАКТ ИЗ БАЗЫ ЗНАНИЙ]:\n${bestMatch.claim.text}\n`;
  contextString += `[ПРАКТИЧЕСКИЕ ШАГИ]:\n- ${bestMatch.practical_actions.join('\n- ')}\n`;
  contextString += `[СТРОГО ЗАПРЕЩЕНО ГОВОРИТЬ]: ${bestMatch.answer_rules.avoid_phrases.join(', ')}\n`;

  if (bestMatch.safety.medical_sensitive) {
    contextString += `[ПРАВИЛО БЕЗОПАСНОСТИ / ЭСКАЛАЦИЯ]: ${bestMatch.safety.escalation}\n`;
  }

  return contextString;
}

/**
 * Ищет кулинарные замены для Фотомодуля по найденным на фото ингредиентам
 */
export function searchAuditKnowledge(detectedIngredients: string[]): string | null {
  const ingredientsLower = detectedIngredients.map(i => i.toLowerCase());
  
  const matchedCards: AuditKnowledgeCard[] = [];

  const cards = auditKnowledge.audit_knowledge as AuditKnowledgeCard[];
  for (const card of cards) {
    const hasMatch = card.ingredient_tags.some(tag => 
      ingredientsLower.some(ingredient => ingredient.includes(tag) || tag.includes(ingredient))
    );
    if (hasMatch) {
      matchedCards.push(card);
    }
  }

  if (matchedCards.length === 0) return null;

  // Для фотомодуля мы можем вернуть сразу несколько советов (например, и про масло, и про сыр)
  let contextString = `[КУЛИНАРНЫЕ ПОДСКАЗКИ ДЛЯ РАЗБОРА ФОТО]:\n`;
  matchedCards.forEach(card => {
    contextString += `- Оценка: ${card.assessment}\n`;
    contextString += `  Замены: ${card.replacement_by_function.join(' ')}\n`;
    contextString += `  Запрещено говорить: ${card.avoid.join(', ')}\n\n`;
  });

  return contextString.trim();
}