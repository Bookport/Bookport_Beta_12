import { Router } from 'express';
import { handleAiChatRequest } from '../controllers/aiController';

const router = Router();

router.post('/chat', handleAiChatRequest);

export default router;