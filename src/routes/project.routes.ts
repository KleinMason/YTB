import { Router, type IRouter } from 'express';
import { create, list, getById } from '../controllers/project.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router: IRouter = Router();

router.get('/', authMiddleware, list);
router.get('/:id', authMiddleware, getById);
router.post('/', authMiddleware, create);

export default router;
