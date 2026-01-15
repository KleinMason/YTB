import 'dotenv/config';
import express, { Express } from 'express';

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

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server running in ${nodeEnv} mode on port ${port}`);
  });
}
