import 'dotenv/config';
import express, { Express } from 'express';
import morgan from 'morgan';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error.js';

export const app: Express = express();
const port = parseInt(process.env.PORT ?? '3000', 10);
const nodeEnv = process.env.NODE_ENV ?? 'development';

// Configure request logging middleware
app.use(morgan('dev'));

// Configure JSON body parser middleware
app.use(express.json());

// Register all routes
registerRoutes(app);

// Global error handling middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server running in ${nodeEnv} mode on port ${port}`);
  });
}
