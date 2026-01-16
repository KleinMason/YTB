import { Router, type IRouter } from 'express';
import { register, login } from '../controllers/auth.controller.js';

const router: IRouter = Router();

router.post('/register', register);
router.post('/login', login);

export default router;
