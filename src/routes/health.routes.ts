import { Router, type IRouter } from 'express';
import { getRoot, getHealth } from '../controllers/health.controller.js';

const router: IRouter = Router();

router.get('/', getRoot);
router.get('/api/health', getHealth);

export default router;
