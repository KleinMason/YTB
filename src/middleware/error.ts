import { Request, Response, NextFunction } from 'express';

const nodeEnv = process.env.NODE_ENV ?? 'development';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Determine status code
  const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;

  // Create consistent error response format
  const errorResponse: {
    error: {
      message: string;
      statusCode: number;
      timestamp: string;
      path: string;
    };
  } = {
    error: {
      message: err.message || 'Internal server error',
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  };

  // Log error in development
  if (nodeEnv === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json(errorResponse);
}
