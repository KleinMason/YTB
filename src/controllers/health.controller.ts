import { Request, Response } from 'express';

const nodeEnv = process.env.NODE_ENV ?? 'development';

export function getRoot(_req: Request, res: Response): void {
  res.json({ message: 'YTB API is running', environment: nodeEnv });
}

export function getHealth(_req: Request, res: Response): void {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}
