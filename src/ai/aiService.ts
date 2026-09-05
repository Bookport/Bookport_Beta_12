export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AIService {
  private apiKey: string;
  private baseURL: string;
  private modelName: string;

  constructor() {
    // Подтягиваем ключ из окружения
    const apiKey = process.env.DASHSCOPE_API_KEY || process.env.ALIBABA_API_KEY;
    
    if (!apiKey) {
      throw new Error('AIService error: DASHSCOPE_API_KEY or ALIBABA_API_KEY is missing in environment variables.');
    }

    this.apiKey = apiKey;
    // Подтягиваем кастомный URL из .env или используем официальный по умолчанию
    this.baseURL = process.env.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
    this.modelName = 'qwen-max';
  }

  /**
   * Отправляет системный промпт и сообщение пользователя в Qwen и возвращает текстовый ответ.
   */
  async generateResponse(systemPrompt: string, userMessage: string): Promise<string> {
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: messages,
          temperature: 0.3,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error [${response.status}]: ${errorText}`);
      }

      const data = await response.json() as any;

      if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
        throw new Error('API Error: Received empty or malformed response structure from Qwen.');
      }

      const answer = data.choices[0].message.content;
      return typeof answer === 'string' ? answer.trim() : 'Извините, не удалось сформировать ответ.';

    } catch (error: any) {
      console.error('AIService generation failed:', error);
      return 'Анна временно недоступна из-за сбоя связи. Попробуй отправить сообщение еще раз через минуту.';
    }
  }
}