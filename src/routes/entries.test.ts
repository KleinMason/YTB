import request from 'supertest';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { app } from '../index.js';
import { signToken } from '../utils/jwt.js';

// Mock prisma client
vi.mock('../db/prisma.js', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    yTBEntry: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('POST /api/entries', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app)
      .post('/api/entries')
      .send({ project_id: 'test-project', entry_date: '2026-01-17' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ project_id: 'test-project', entry_date: '2026-01-17' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should accept project_id and entry_date in body', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const entryId = 'test-entry-id-789';
    const entryDate = '2026-01-17';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.yTBEntry.findFirst).mockResolvedValue(null);

    vi.mocked(prisma.yTBEntry.create).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate: new Date(entryDate + 'T00:00:00.000Z'),
      yesterdayMd: null,
      todayMd: null,
      blockersMd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ project_id: projectId, entry_date: entryDate });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('entry');
    expect(response.body.entry).toHaveProperty('projectId', projectId);
  });

  it('should return 400 if project_id is missing', async () => {
    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ entry_date: '2026-01-17' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project ID is required');
  });

  it('should return 400 if entry_date is missing', async () => {
    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ project_id: 'test-project-id' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Entry date is required');
  });

  it('should return 400 if entry_date is invalid format', async () => {
    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ project_id: 'test-project-id', entry_date: '01-17-2026' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Entry date must be in YYYY-MM-DD format');
  });

  it('should return 404 if project not found', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'nonexistent-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ project_id: projectId, entry_date: '2026-01-17' });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project not found');
  });

  it('should return 403 if project belongs to different user', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const otherUserId = 'other-user-id-456';
    const projectId = 'test-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Other User Project',
      color: null,
      icon: null,
      userId: otherUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ project_id: projectId, entry_date: '2026-01-17' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Forbidden');
  });

  it('should return 409 if entry already exists for project and date', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const entryDate = '2026-01-17';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.yTBEntry.findFirst).mockResolvedValue({
      id: 'existing-entry-id',
      userId,
      projectId,
      entryDate: new Date(entryDate + 'T00:00:00.000Z'),
      yesterdayMd: 'Did stuff',
      todayMd: 'Doing stuff',
      blockersMd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ project_id: projectId, entry_date: entryDate });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Entry already exists for this project and date');
  });

  it('should insert entry with user_id, project_id, entry_date', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const entryId = 'test-entry-id-789';
    const entryDate = '2026-01-17';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.yTBEntry.findFirst).mockResolvedValue(null);

    vi.mocked(prisma.yTBEntry.create).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate: new Date(entryDate + 'T00:00:00.000Z'),
      yesterdayMd: null,
      todayMd: null,
      blockersMd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ project_id: projectId, entry_date: entryDate });

    expect(response.status).toBe(201);
    expect(prisma.yTBEntry.create).toHaveBeenCalledWith({
      data: {
        projectId,
        userId,
        entryDate: new Date(entryDate + 'T00:00:00.000Z'),
        yesterdayMd: null,
        todayMd: null,
        blockersMd: null,
      },
    });
  });

  it('should include yesterday_md, today_md, blockers_md if provided', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const entryId = 'test-entry-id-789';
    const entryDate = '2026-01-17';
    const yesterdayMd = 'Did code review';
    const todayMd = 'Implementing new feature';
    const blockersMd = 'Waiting for API docs';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.yTBEntry.findFirst).mockResolvedValue(null);

    vi.mocked(prisma.yTBEntry.create).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate: new Date(entryDate + 'T00:00:00.000Z'),
      yesterdayMd,
      todayMd,
      blockersMd,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project_id: projectId,
        entry_date: entryDate,
        yesterday_md: yesterdayMd,
        today_md: todayMd,
        blockers_md: blockersMd,
      });

    expect(response.status).toBe(201);
    expect(response.body.entry).toHaveProperty('yesterdayMd', yesterdayMd);
    expect(response.body.entry).toHaveProperty('todayMd', todayMd);
    expect(response.body.entry).toHaveProperty('blockersMd', blockersMd);
  });

  it('should return created entry with id', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const entryId = 'test-entry-id-789';
    const entryDate = '2026-01-17';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.yTBEntry.findFirst).mockResolvedValue(null);

    vi.mocked(prisma.yTBEntry.create).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate: new Date(entryDate + 'T00:00:00.000Z'),
      yesterdayMd: null,
      todayMd: null,
      blockersMd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ project_id: projectId, entry_date: entryDate });

    expect(response.status).toBe(201);
    expect(response.body.entry).toHaveProperty('id', entryId);
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id';

    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ project_id: projectId, entry_date: '2026-01-17' });

    expect(response.status).toBe(500);
  });
});

describe('GET /api/entries', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app).get('/api/entries');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .get('/api/entries')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should accept project_id query parameter', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.yTBEntry.findMany).mockResolvedValue([]);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries')
      .query({ project_id: projectId })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(prisma.yTBEntry.findMany).toHaveBeenCalledWith({
      where: { userId, projectId },
      orderBy: { entryDate: 'desc' },
    });
  });

  it('should accept start_date and end_date query parameters', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const startDate = '2026-01-01';
    const endDate = '2026-01-31';

    vi.mocked(prisma.yTBEntry.findMany).mockResolvedValue([]);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries')
      .query({ start_date: startDate, end_date: endDate })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(prisma.yTBEntry.findMany).toHaveBeenCalledWith({
      where: {
        userId,
        entryDate: {
          gte: new Date(startDate + 'T00:00:00.000Z'),
          lte: new Date(endDate + 'T00:00:00.000Z'),
        },
      },
      orderBy: { entryDate: 'desc' },
    });
  });

  it('should return entries matching filters', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const entryDate = new Date('2026-01-17T00:00:00.000Z');

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.yTBEntry.findMany).mockResolvedValue([
      {
        id: 'entry-1',
        userId,
        projectId,
        entryDate,
        yesterdayMd: 'Did coding',
        todayMd: 'More coding',
        blockersMd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries')
      .query({ project_id: projectId })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('entries');
    expect(response.body.entries).toHaveLength(1);
    expect(response.body.entries[0]).toHaveProperty('id', 'entry-1');
    expect(response.body.entries[0]).toHaveProperty('projectId', projectId);
  });

  it('should query entries where project_id matches', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.yTBEntry.findMany).mockResolvedValue([]);

    const token = signToken(userId);

    await request(app)
      .get('/api/entries')
      .query({ project_id: projectId })
      .set('Authorization', `Bearer ${token}`);

    expect(prisma.yTBEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId,
        }),
      })
    );
  });

  it('should verify project belongs to user when filtering by project_id', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const otherUserId = 'other-user-id-456';
    const projectId = 'test-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Other User Project',
      color: null,
      icon: null,
      userId: otherUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries')
      .query({ project_id: projectId })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Forbidden');
  });

  it('should return 404 if project_id does not exist', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'nonexistent-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries')
      .query({ project_id: projectId })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project not found');
  });

  it('should query entries where entry_date >= start_date', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const startDate = '2026-01-15';

    vi.mocked(prisma.yTBEntry.findMany).mockResolvedValue([]);

    const token = signToken(userId);

    await request(app)
      .get('/api/entries')
      .query({ start_date: startDate })
      .set('Authorization', `Bearer ${token}`);

    expect(prisma.yTBEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entryDate: expect.objectContaining({
            gte: new Date(startDate + 'T00:00:00.000Z'),
          }),
        }),
      })
    );
  });

  it('should query entries where entry_date <= end_date', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const endDate = '2026-01-20';

    vi.mocked(prisma.yTBEntry.findMany).mockResolvedValue([]);

    const token = signToken(userId);

    await request(app)
      .get('/api/entries')
      .query({ end_date: endDate })
      .set('Authorization', `Bearer ${token}`);

    expect(prisma.yTBEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entryDate: expect.objectContaining({
            lte: new Date(endDate + 'T00:00:00.000Z'),
          }),
        }),
      })
    );
  });

  it('should return entries within date range', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const startDate = '2026-01-15';
    const endDate = '2026-01-20';

    vi.mocked(prisma.yTBEntry.findMany).mockResolvedValue([
      {
        id: 'entry-1',
        userId,
        projectId,
        entryDate: new Date('2026-01-16T00:00:00.000Z'),
        yesterdayMd: null,
        todayMd: null,
        blockersMd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'entry-2',
        userId,
        projectId,
        entryDate: new Date('2026-01-18T00:00:00.000Z'),
        yesterdayMd: null,
        todayMd: null,
        blockersMd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries')
      .query({ start_date: startDate, end_date: endDate })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.entries).toHaveLength(2);
  });

  it('should return empty array when no entries match', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';

    vi.mocked(prisma.yTBEntry.findMany).mockResolvedValue([]);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('entries');
    expect(response.body.entries).toEqual([]);
  });

  it('should return entries with all fields', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const entryDate = new Date('2026-01-17T00:00:00.000Z');
    const createdAt = new Date();
    const updatedAt = new Date();

    vi.mocked(prisma.yTBEntry.findMany).mockResolvedValue([
      {
        id: 'entry-1',
        userId,
        projectId,
        entryDate,
        yesterdayMd: 'Yesterday content',
        todayMd: 'Today content',
        blockersMd: 'Blockers content',
        createdAt,
        updatedAt,
      },
    ]);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.entries[0]).toHaveProperty('id', 'entry-1');
    expect(response.body.entries[0]).toHaveProperty('userId', userId);
    expect(response.body.entries[0]).toHaveProperty('projectId', projectId);
    expect(response.body.entries[0]).toHaveProperty('yesterdayMd', 'Yesterday content');
    expect(response.body.entries[0]).toHaveProperty('todayMd', 'Today content');
    expect(response.body.entries[0]).toHaveProperty('blockersMd', 'Blockers content');
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';

    vi.mocked(prisma.yTBEntry.findMany).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
  });
});

describe('GET /api/entries/:id', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app).get('/api/entries/entry-123');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .get('/api/entries/entry-123')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should query entry by id', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const entryId = 'entry-id-456';
    const projectId = 'project-id-789';
    const entryDate = new Date('2026-01-17T00:00:00.000Z');
    const createdAt = new Date();
    const updatedAt = new Date();

    vi.mocked(prisma.yTBEntry.findUnique).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate,
      yesterdayMd: 'Did coding',
      todayMd: 'More coding',
      blockersMd: null,
      createdAt,
      updatedAt,
    });

    const token = signToken(userId);

    const response = await request(app)
      .get(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(prisma.yTBEntry.findUnique).toHaveBeenCalledWith({
      where: { id: entryId },
    });
  });

  it('should return 404 if entry not found', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const entryId = 'nonexistent-entry-id';

    vi.mocked(prisma.yTBEntry.findUnique).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .get(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Entry not found');
  });

  it('should return 403 if user_id does not match', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const otherUserId = 'other-user-id-456';
    const entryId = 'entry-id-789';
    const projectId = 'project-id-000';
    const entryDate = new Date('2026-01-17T00:00:00.000Z');

    vi.mocked(prisma.yTBEntry.findUnique).mockResolvedValue({
      id: entryId,
      userId: otherUserId,
      projectId,
      entryDate,
      yesterdayMd: null,
      todayMd: null,
      blockersMd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .get(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Forbidden');
  });

  it('should return entry data when found and user matches', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const entryId = 'entry-id-456';
    const projectId = 'project-id-789';
    const entryDate = new Date('2026-01-17T00:00:00.000Z');
    const createdAt = new Date();
    const updatedAt = new Date();

    vi.mocked(prisma.yTBEntry.findUnique).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate,
      yesterdayMd: 'Yesterday content',
      todayMd: 'Today content',
      blockersMd: 'Blockers content',
      createdAt,
      updatedAt,
    });

    const token = signToken(userId);

    const response = await request(app)
      .get(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('entry');
    expect(response.body.entry).toHaveProperty('id', entryId);
    expect(response.body.entry).toHaveProperty('userId', userId);
    expect(response.body.entry).toHaveProperty('projectId', projectId);
    expect(response.body.entry).toHaveProperty('yesterdayMd', 'Yesterday content');
    expect(response.body.entry).toHaveProperty('todayMd', 'Today content');
    expect(response.body.entry).toHaveProperty('blockersMd', 'Blockers content');
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const entryId = 'entry-id-456';

    vi.mocked(prisma.yTBEntry.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .get(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
  });
});

describe('PUT /api/entries/:id', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app)
      .put('/api/entries/entry-123')
      .send({ yesterday_md: 'Updated content' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .put('/api/entries/entry-123')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ yesterday_md: 'Updated content' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should verify entry belongs to user and return 404 if not found', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const entryId = 'nonexistent-entry-id';

    vi.mocked(prisma.yTBEntry.findUnique).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .put(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ yesterday_md: 'Updated content' });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Entry not found');
  });

  it('should verify entry belongs to user and return 403 if user_id does not match', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const otherUserId = 'other-user-id-456';
    const entryId = 'entry-id-789';
    const projectId = 'project-id-000';
    const entryDate = new Date('2026-01-17T00:00:00.000Z');

    vi.mocked(prisma.yTBEntry.findUnique).mockResolvedValue({
      id: entryId,
      userId: otherUserId,
      projectId,
      entryDate,
      yesterdayMd: 'Original content',
      todayMd: null,
      blockersMd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .put(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ yesterday_md: 'Updated content' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Forbidden');
  });

  it('should update entry fields and return updated entry', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const entryId = 'entry-id-456';
    const projectId = 'project-id-789';
    const entryDate = new Date('2026-01-17T00:00:00.000Z');
    const createdAt = new Date('2026-01-17T10:00:00.000Z');
    const updatedAt = new Date('2026-01-17T12:00:00.000Z');

    vi.mocked(prisma.yTBEntry.findUnique).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate,
      yesterdayMd: 'Original yesterday',
      todayMd: 'Original today',
      blockersMd: 'Original blockers',
      createdAt,
      updatedAt: createdAt,
    });

    vi.mocked(prisma.yTBEntry.update).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate,
      yesterdayMd: 'Updated yesterday',
      todayMd: 'Updated today',
      blockersMd: 'Updated blockers',
      createdAt,
      updatedAt,
    });

    const token = signToken(userId);

    const response = await request(app)
      .put(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        yesterday_md: 'Updated yesterday',
        today_md: 'Updated today',
        blockers_md: 'Updated blockers',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('entry');
    expect(response.body.entry).toHaveProperty('id', entryId);
    expect(response.body.entry).toHaveProperty('userId', userId);
    expect(response.body.entry).toHaveProperty('projectId', projectId);
    expect(response.body.entry).toHaveProperty('yesterdayMd', 'Updated yesterday');
    expect(response.body.entry).toHaveProperty('todayMd', 'Updated today');
    expect(response.body.entry).toHaveProperty('blockersMd', 'Updated blockers');

    expect(prisma.yTBEntry.update).toHaveBeenCalledWith({
      where: { id: entryId },
      data: {
        yesterdayMd: 'Updated yesterday',
        todayMd: 'Updated today',
        blockersMd: 'Updated blockers',
      },
    });
  });

  it('should update only provided fields', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const entryId = 'entry-id-456';
    const projectId = 'project-id-789';
    const entryDate = new Date('2026-01-17T00:00:00.000Z');
    const createdAt = new Date('2026-01-17T10:00:00.000Z');
    const updatedAt = new Date('2026-01-17T12:00:00.000Z');

    vi.mocked(prisma.yTBEntry.findUnique).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate,
      yesterdayMd: 'Original yesterday',
      todayMd: 'Original today',
      blockersMd: 'Original blockers',
      createdAt,
      updatedAt: createdAt,
    });

    vi.mocked(prisma.yTBEntry.update).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate,
      yesterdayMd: 'Updated yesterday',
      todayMd: 'Original today',
      blockersMd: 'Original blockers',
      createdAt,
      updatedAt,
    });

    const token = signToken(userId);

    const response = await request(app)
      .put(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ yesterday_md: 'Updated yesterday' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('entry');

    expect(prisma.yTBEntry.update).toHaveBeenCalledWith({
      where: { id: entryId },
      data: { yesterdayMd: 'Updated yesterday' },
    });
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const entryId = 'entry-id-456';

    vi.mocked(prisma.yTBEntry.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .put(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ yesterday_md: 'Updated content' });

    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/entries/:id', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app)
      .delete('/api/entries/entry-123');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .delete('/api/entries/entry-123')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should verify entry belongs to user and return 404 if not found', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const entryId = 'nonexistent-entry-id';

    vi.mocked(prisma.yTBEntry.findUnique).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .delete(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Entry not found');
  });

  it('should verify entry belongs to user and return 403 if user_id does not match', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const otherUserId = 'other-user-id-456';
    const entryId = 'entry-id-789';
    const projectId = 'project-id-000';
    const entryDate = new Date('2026-01-17T00:00:00.000Z');

    vi.mocked(prisma.yTBEntry.findUnique).mockResolvedValue({
      id: entryId,
      userId: otherUserId,
      projectId,
      entryDate,
      yesterdayMd: 'Some content',
      todayMd: null,
      blockersMd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .delete(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Forbidden');
  });

  it('should delete entry and return 204 no content', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const entryId = 'entry-id-456';
    const projectId = 'project-id-789';
    const entryDate = new Date('2026-01-17T00:00:00.000Z');
    const createdAt = new Date('2026-01-17T10:00:00.000Z');
    const updatedAt = new Date('2026-01-17T10:00:00.000Z');

    vi.mocked(prisma.yTBEntry.findUnique).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate,
      yesterdayMd: 'Yesterday content',
      todayMd: 'Today content',
      blockersMd: 'Blockers content',
      createdAt,
      updatedAt,
    });

    vi.mocked(prisma.yTBEntry.delete).mockResolvedValue({
      id: entryId,
      userId,
      projectId,
      entryDate,
      yesterdayMd: 'Yesterday content',
      todayMd: 'Today content',
      blockersMd: 'Blockers content',
      createdAt,
      updatedAt,
    });

    const token = signToken(userId);

    const response = await request(app)
      .delete(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    expect(prisma.yTBEntry.delete).toHaveBeenCalledWith({
      where: { id: entryId },
    });
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const entryId = 'entry-id-456';

    vi.mocked(prisma.yTBEntry.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .delete(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
  });
});

describe('GET /api/entries/previous', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app)
      .get('/api/entries/previous');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .get('/api/entries/previous')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should accept project_id and date query parameters', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const date = '2026-01-17';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.yTBEntry.findFirst).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries/previous')
      .query({ project_id: projectId, date })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('should return 400 if project_id is missing', async () => {
    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries/previous')
      .query({ date: '2026-01-17' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project ID is required');
  });

  it('should return 400 if date is missing', async () => {
    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries/previous')
      .query({ project_id: 'project-123' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Date is required');
  });

  it('should return 400 if date format is invalid', async () => {
    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries/previous')
      .query({ project_id: 'project-123', date: '01-17-2026' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Date must be in YYYY-MM-DD format');
  });

  it('should return 404 if project not found', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'nonexistent-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries/previous')
      .query({ project_id: projectId, date: '2026-01-17' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project not found');
  });

  it('should return 403 if project belongs to different user', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const otherUserId = 'other-user-id-456';
    const projectId = 'test-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Other User Project',
      color: null,
      icon: null,
      userId: otherUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries/previous')
      .query({ project_id: projectId, date: '2026-01-17' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Forbidden');
  });

  it('should find most recent entry before given date', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const date = '2026-01-17';
    const previousEntryDate = new Date('2026-01-15T00:00:00.000Z');

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.yTBEntry.findFirst).mockResolvedValue({
      id: 'entry-123',
      userId,
      projectId,
      entryDate: previousEntryDate,
      yesterdayMd: 'Did some work',
      todayMd: 'Doing more work',
      blockersMd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries/previous')
      .query({ project_id: projectId, date })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('entry');
    expect(response.body.entry).toHaveProperty('id', 'entry-123');
    expect(response.body.entry).toHaveProperty('yesterdayMd', 'Did some work');
    expect(response.body.entry).toHaveProperty('todayMd', 'Doing more work');

    expect(prisma.yTBEntry.findFirst).toHaveBeenCalledWith({
      where: {
        projectId,
        userId,
        entryDate: {
          lt: new Date(date + 'T00:00:00.000Z'),
        },
      },
      orderBy: {
        entryDate: 'desc',
      },
    });
  });

  it('should return null if no previous entry exists', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const date = '2026-01-01';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.yTBEntry.findFirst).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries/previous')
      .query({ project_id: projectId, date })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('entry', null);
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';

    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/entries/previous')
      .query({ project_id: projectId, date: '2026-01-17' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
  });
});
