import { Response, NextFunction } from 'express';
import { createEntry } from '../services/entry.service.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

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

    const { project_id, entry_date, yesterday_md, today_md, blockers_md } = req.body;

    const result = await createEntry({
      projectId: project_id,
      entryDate: entry_date,
      yesterdayMd: yesterday_md,
      todayMd: today_md,
      blockersMd: blockers_md,
      userId,
    });

    if (!result.success) {
      res.status(result.error.statusCode).json({
        error: result.error,
      });
      return;
    }

    res.status(201).json({
      message: 'Entry created successfully',
      entry: result.entry,
    });
  } catch (error) {
    next(error);
  }
}
