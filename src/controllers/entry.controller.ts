import { Response, NextFunction } from 'express';
import { createEntry, getEntries, getEntryById, updateEntry } from '../services/entry.service.js';
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

    const { project_id, start_date, end_date } = req.query;

    const result = await getEntries({
      userId,
      projectId: project_id as string | undefined,
      startDate: start_date as string | undefined,
      endDate: end_date as string | undefined,
    });

    if (!result.success) {
      res.status(result.error.statusCode).json({
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      entries: result.entries,
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

export async function getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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

    const { id } = req.params;

    const result = await getEntryById(id, userId);

    if (!result.success) {
      res.status(result.error.statusCode).json({
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      entry: result.entry,
    });
  } catch (error) {
    next(error);
  }
}

export async function update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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

    const { id } = req.params;
    const { yesterday_md, today_md, blockers_md } = req.body;

    const result = await updateEntry(id, userId, {
      yesterdayMd: yesterday_md,
      todayMd: today_md,
      blockersMd: blockers_md,
    });

    if (!result.success) {
      res.status(result.error.statusCode).json({
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      entry: result.entry,
    });
  } catch (error) {
    next(error);
  }
}
