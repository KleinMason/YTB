import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';

export const app: Express = express();
const port = parseInt(process.env.PORT ?? '3000', 10);
const nodeEnv = process.env.NODE_ENV ?? 'development';

// Configure JSON body parser middleware
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'YTB API is running', environment: nodeEnv });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint for JSON body parsing verification (used in tests)
app.post('/api/test-json', (req, res) => {
  res.json({ received: req.body });
});

// Test endpoint for error handling verification (used in tests)
app.get('/api/test-error', (_req, _res, next) => {
  next(new Error('Test error'));
});

app.post('/api/test-error', (_req, _res, next) => {
  const error = new Error('Test error with message');
  (error as Error & { statusCode?: number }).statusCode = 400;
  next(error);
});

// Global error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server running in ${nodeEnv} mode on port ${port}`);
  });
}
