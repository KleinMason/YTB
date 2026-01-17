import { Router, type IRouter } from 'express';
import { create, list } from '../controllers/entry.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router: IRouter = Router();

router.get('/', authMiddleware, list);
router.post('/', authMiddleware, create);

export default router;
