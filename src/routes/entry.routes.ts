import { Router, type IRouter } from 'express';
import { create } from '../controllers/entry.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router: IRouter = Router();

router.post('/', authMiddleware, create);

export default router;
