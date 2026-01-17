import { Response, NextFunction } from 'express';
import { createProject, getProjects } from '../services/project.service.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
      return;
    }

    const result = await getProjects(userId);

    res.status(200).json({
      projects: result.projects,
    });
  } catch (error) {
    next(error);
  }
}

export async function create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
      return;
    }

    const { name, color, icon } = req.body;

    const result = await createProject({ name, color, icon, userId });

    if (!result.success) {
      res.status(result.error.statusCode).json({
        error: result.error,
      });
      return;
    }

    res.status(201).json({
      message: 'Project created successfully',
      project: result.project,
    });
  } catch (error) {
    next(error);
  }
}
