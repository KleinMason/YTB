import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';

export const app: Express = express();
const port = parseInt(process.env.PORT ?? '3000', 10);
const nodeEnv = process.env.NODE_ENV ?? 'development';

// Configure CORS middleware
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      'http://localhost:5173', // Frontend dev server
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // In test mode, allow all origins for testing purposes
    // In development/production, only allow specified origins
    if (nodeEnv === 'test' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.get('/', (_req, res) => {
  res.json({ message: 'YTB API is running', environment: nodeEnv });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server running in ${nodeEnv} mode on port ${port}`);
  });
}
