import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';

export function testJson(req: Request, res: Response): void {
  res.json({ received: req.body });
}

export function testErrorGet(_req: Request, _res: Response, next: NextFunction): void {
  next(new Error('Test error'));
}

export function testErrorPost(_req: Request, _res: Response, next: NextFunction): void {
  const error = new Error('Test error with message');
  (error as Error & { statusCode?: number }).statusCode = 400;
  next(error);
}

export function testAuth(req: AuthenticatedRequest, res: Response): void {
  res.json({ userId: req.user?.userId, authenticated: true });
}
