import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth.js';

export const app: Express = express();
const port = parseInt(process.env.PORT ?? '3000', 10);
const nodeEnv = process.env.NODE_ENV ?? 'development';

// Configure request logging middleware
app.use(morgan('dev'));

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

// Test endpoint for authentication middleware verification (used in tests)
app.get('/api/test-auth', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({ userId: req.user?.userId, authenticated: true });
});

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation requirements
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  return emailRegex.test(email);
}

/**
 * Validate password requirements
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return { valid: errors.length === 0, errors };
}

// POST /api/auth/register - User registration endpoint
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    res.status(400).json({
      error: {
        message: 'Email and password are required',
        statusCode: 400,
      },
    });
    return;
  }

  // Validate email format
  if (!isValidEmail(email)) {
    res.status(400).json({
      error: {
        message: 'Invalid email format',
        statusCode: 400,
      },
    });
    return;
  }

  // Validate password requirements
  const passwordValidation = isValidPassword(password);
  if (!passwordValidation.valid) {
    res.status(400).json({
      error: {
        message: 'Password does not meet requirements',
        statusCode: 400,
        details: passwordValidation.errors,
      },
    });
    return;
  }

  // For now, return success (database integration will be added in a separate feature)
  res.status(201).json({
    message: 'Validation passed',
    email,
  });
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
