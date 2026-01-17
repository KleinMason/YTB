import { Express } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import projectRoutes from './project.routes.js';
import entryRoutes from './entry.routes.js';
import testRoutes from './test.routes.js';

export function registerRoutes(app: Express): void {
  // Health and root routes
  app.use(healthRoutes);

  // Auth routes
  app.use('/api/auth', authRoutes);

  // Project routes
  app.use('/api/projects', projectRoutes);

  // Entry routes
  app.use('/api/entries', entryRoutes);

  // Test routes (used in tests)
  app.use('/api', testRoutes);
}
