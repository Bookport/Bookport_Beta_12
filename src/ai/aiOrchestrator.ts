import { determineIntent } from './intentRouter';
import { searchChatKnowledge, searchAuditKnowledge } from './ragService';
import { UserState } from './contextBuilder';
import { createPromptPayload } from './promptFactory';
import { AIService } from './aiService';

// Инициализируем клиента Qwen один раз при запуске модуля
const aiService = new AIService();

export interface OrchestratorInput {
  message: string;
  userState: UserState;
  hasImage?: boolean;
  detectedIngredients?: string[]; // Используется, если передан фотоаудит
}

export interface OrchestratorResult {
  category: 'smalltalk' | 'audit' | 'chat';
  reply: string;
}

/**
 * Главный оркестратор Анны. Обрабатывает входящий запрос от приложения от начала до конца.
 */
export async function processAnnaRequest(input: OrchestratorInput): Promise<OrchestratorResult> {
  const { message, userState, hasImage = false, detectedIngredients = [] } = input;

  // 1. Прогоняем через роутер намерений
  const intent = determineIntent(message, hasImage);

  // 2. Если это легкий smalltalk (приветствие, благодарность), возвращаем заготовку без вызова LLM
  if (intent.category === 'smalltalk' && intent.fastResponse) {
    return {
      category: 'smalltalk',
      reply: intent.fastResponse
    };
  }

  let ragContext: string | null = null;
  let mode: 'chat' | 'audit' = 'chat';

  // 3. Если это фотоаудит тарелки
  if (intent.category === 'audit') {
    mode = 'audit';
    ragContext = searchAuditKnowledge(detectedIngredients);
  } 
  // 4. Если это умный чат нутрициолога
  else if (intent.category === 'chat' && intent.searchQuery) {
    mode = 'chat';
    ragContext = searchChatKnowledge(intent.searchQuery);
  }

  // 5. Собираем финальный промпт
  const payload = createPromptPayload(message, userState, ragContext, mode);

  // 6. Отправляем запрос в Qwen через наш AIService
  const aiReply = await aiService.generateResponse(payload.systemPrompt, payload.userPrompt);

  return {
    category: intent.category,
    reply: aiReply
  };
}