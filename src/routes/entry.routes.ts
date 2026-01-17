import { Router, type IRouter } from 'express';
import { create, list, getById, update, destroy } from '../controllers/entry.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router: IRouter = Router();

router.get('/', authMiddleware, list);
router.get('/:id', authMiddleware, getById);
router.post('/', authMiddleware, create);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, destroy);

export default router;
