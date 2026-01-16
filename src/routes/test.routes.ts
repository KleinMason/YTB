import { Router, type IRouter } from 'express';
import { testJson, testErrorGet, testErrorPost, testAuth } from '../controllers/test.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router: IRouter = Router();

router.post('/test-json', testJson);
router.get('/test-error', testErrorGet);
router.post('/test-error', testErrorPost);
router.get('/test-auth', authMiddleware, testAuth);

export default router;
