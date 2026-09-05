import { buildUserContext, UserState } from './contextBuilder';

export interface PromptPayload {
  systemPrompt: string;
  userPrompt: string;
}

const ANNA_CORE_IDENTITY = `Ты Анна — главный проводник по цельному растительному питанию (WFPB). 
Твоя задача — давать научно обоснованные, практичные и бережные советы по питанию, микробиоте, нутриентам и образу жизни.

ЖЕСТКИЕ ПРАВИЛА (SAFETY GUARDRAILS):
1. Никогда не ставь медицинских диагнозов и не назначай лечение, лекарства или дозировки добавок.
2. Не используй устрашающий, токсичный или стыдящий язык («яд», «токсин», «гниение», «сорвался», «грех», «убийца сосудов»).
3. Опирайся только на проверенные данные. Если вопрос выходит за рамки WFPB-питания или касается острых симптомов — мягко направляй к врачу.
4. Отвечай кратко, емко, без воды и нравоучений. 1 факт + 1-2 практических шага.`;

/**
 * Собирает финальный промпт для Qwen.
 */
export function createPromptPayload(
  rawUserMessage: string,
  userState: UserState,
  ragContext: string | null,
  mode: 'chat' | 'audit' = 'chat'
): PromptPayload {
  const userContextStr = buildUserContext(userState);

  let systemPrompt = `${ANNA_CORE_IDENTITY}\n\n${userContextStr}`;

  if (mode === 'audit') {
    systemPrompt += `\n\n[РЕЖИМ РАБОТЫ]: Фотомодуль (анализ тарелки / кулинарный аудит). Предложи дружелюбные, вкусные WFPB-замены по текстуре.`;
  } else {
    systemPrompt += `\n\n[РЕЖИМ РАБОТЫ]: Умный чат нутрициолога.`;
  }

  if (ragContext) {
    systemPrompt += `\n\n${ragContext}`;
  }

  return {
    systemPrompt,
    userPrompt: rawUserMessage
  };
}