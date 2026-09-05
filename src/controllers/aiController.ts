import { Request, Response } from 'express';
import { processAnnaRequest } from '../ai';

/**
 * Контроллер для обработки запросов к ИИ-ассистенту Анне
 */
export async function handleAiChatRequest(req: Request, res: Response) {
  try {
    const { message, userState, hasImage, detectedIngredients } = req.body;

    if (!message && !hasImage) {
      return res.status(400).json({ error: 'Message or image is required.' });
    }

    // Запускаем наш оркестратор
    const result = await processAnnaRequest({
      message: message || '',
      userState: userState || { userName: 'Гость' },
      hasImage: !!hasImage,
      detectedIngredients: detectedIngredients || []
    });

    return res.status(200).json({
      success: true,
      category: result.category,
      reply: result.reply
    });

  } catch (error: any) {
    console.error('Controller error in handleAiChatRequest:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      reply: 'Анна временно недоступна. Попробуйте позже.' 
    });
  }
}