import request from 'supertest';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { app } from '../index.js';
import { signToken } from '../utils/jwt.js';

// Mock prisma client
vi.mock('../db/prisma.js', () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('POST /api/projects', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ name: 'Test Project' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should accept name in request body', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const projectName = 'My Test Project';

    vi.mocked(prisma.project.create).mockResolvedValue({
      id: projectId,
      name: projectName,
      color: null,
      icon: null,
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: projectName });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('project');
    expect(response.body.project).toHaveProperty('name', projectName);
  });

  it('should return 400 if name is missing', async () => {
    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project name is required');
  });

  it('should return 400 if name is empty string', async () => {
    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project name is required');
  });

  it('should return 400 if name is only whitespace', async () => {
    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project name is required');
  });

  it('should return created project with id', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const projectName = 'My Test Project';
    const createdAt = new Date();
    const updatedAt = new Date();

    vi.mocked(prisma.project.create).mockResolvedValue({
      id: projectId,
      name: projectName,
      color: null,
      icon: null,
      userId: userId,
      createdAt,
      updatedAt,
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: projectName });

    expect(response.status).toBe(201);
    expect(response.body.project).toHaveProperty('id', projectId);
  });

  it('should insert project with user_id from token', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const projectName = 'My Test Project';

    vi.mocked(prisma.project.create).mockResolvedValue({
      id: projectId,
      name: projectName,
      color: null,
      icon: null,
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: projectName });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: projectName,
        color: null,
        icon: null,
        userId: userId,
      },
    });
  });

  it('should include optional color if provided', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const projectName = 'My Test Project';
    const projectColor = '#FF5733';

    vi.mocked(prisma.project.create).mockResolvedValue({
      id: projectId,
      name: projectName,
      color: projectColor,
      icon: null,
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: projectName, color: projectColor });

    expect(response.status).toBe(201);
    expect(response.body.project).toHaveProperty('color', projectColor);
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: projectName,
        color: projectColor,
        icon: null,
        userId: userId,
      },
    });
  });

  it('should include optional icon if provided', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const projectName = 'My Test Project';
    const projectIcon = 'rocket';

    vi.mocked(prisma.project.create).mockResolvedValue({
      id: projectId,
      name: projectName,
      color: null,
      icon: projectIcon,
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: projectName, icon: projectIcon });

    expect(response.status).toBe(201);
    expect(response.body.project).toHaveProperty('icon', projectIcon);
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: projectName,
        color: null,
        icon: projectIcon,
        userId: userId,
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';

    vi.mocked(prisma.project.create).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Project' });

    expect(response.status).toBe(500);
  });
});

describe('GET /api/projects', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app).get('/api/projects');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should query projects where user_id matches token', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';

    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    const token = signToken(userId);

    await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should return array of projects', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projects = [
      {
        id: 'project-1',
        name: 'Project One',
        color: '#FF0000',
        icon: 'folder',
        userId,
        createdAt: new Date('2026-01-15T00:00:00.000Z'),
        updatedAt: new Date('2026-01-15T00:00:00.000Z'),
      },
      {
        id: 'project-2',
        name: 'Project Two',
        color: null,
        icon: null,
        userId,
        createdAt: new Date('2026-01-14T00:00:00.000Z'),
        updatedAt: new Date('2026-01-14T00:00:00.000Z'),
      },
    ];

    vi.mocked(prisma.project.findMany).mockResolvedValue(projects);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('projects');
    expect(Array.isArray(response.body.projects)).toBe(true);
    expect(response.body.projects).toHaveLength(2);
    expect(response.body.projects[0]).toHaveProperty('id', 'project-1');
    expect(response.body.projects[0]).toHaveProperty('name', 'Project One');
    expect(response.body.projects[1]).toHaveProperty('id', 'project-2');
    expect(response.body.projects[1]).toHaveProperty('name', 'Project Two');
  });

  it('should return empty array when user has no projects', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';

    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('projects');
    expect(response.body.projects).toEqual([]);
  });

  it('should return project with all fields', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const createdAt = new Date('2026-01-15T10:30:00.000Z');
    const updatedAt = new Date('2026-01-15T11:00:00.000Z');

    vi.mocked(prisma.project.findMany).mockResolvedValue([
      {
        id: 'project-1',
        name: 'Test Project',
        color: '#00FF00',
        icon: 'star',
        userId,
        createdAt,
        updatedAt,
      },
    ]);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    const project = response.body.projects[0];
    expect(project).toHaveProperty('id', 'project-1');
    expect(project).toHaveProperty('name', 'Test Project');
    expect(project).toHaveProperty('color', '#00FF00');
    expect(project).toHaveProperty('icon', 'star');
    expect(project).toHaveProperty('userId', userId);
    expect(project).toHaveProperty('createdAt');
    expect(project).toHaveProperty('updatedAt');
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';

    vi.mocked(prisma.project.findMany).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
  });
});

describe('GET /api/projects/:id', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app).get('/api/projects/some-project-id');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .get('/api/projects/some-project-id')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should query project by id', async () => {
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

    const token = signToken(userId);

    await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: projectId },
    });
  });

  it('should return 404 if project not found', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'nonexistent-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project not found');
  });

  it('should return 403 if user_id does not match', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const differentUserId = 'different-user-id-456';
    const projectId = 'test-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId: differentUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Forbidden');
  });

  it('should return project data when found and user matches', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const createdAt = new Date('2026-01-15T10:30:00.000Z');
    const updatedAt = new Date('2026-01-15T11:00:00.000Z');

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: '#FF0000',
      icon: 'folder',
      userId,
      createdAt,
      updatedAt,
    });

    const token = signToken(userId);

    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('project');
    expect(response.body.project).toHaveProperty('id', projectId);
    expect(response.body.project).toHaveProperty('name', 'Test Project');
    expect(response.body.project).toHaveProperty('color', '#FF0000');
    expect(response.body.project).toHaveProperty('icon', 'folder');
    expect(response.body.project).toHaveProperty('userId', userId);
    expect(response.body.project).toHaveProperty('createdAt');
    expect(response.body.project).toHaveProperty('updatedAt');
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id';

    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
  });
});

describe('PUT /api/projects/:id', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app)
      .put('/api/projects/some-project-id')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .put('/api/projects/some-project-id')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should verify project belongs to user and return 404 if not found', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'nonexistent-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project not found');
  });

  it('should verify project belongs to user and return 403 if user_id does not match', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const differentUserId = 'different-user-id-456';
    const projectId = 'test-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Original Project',
      color: null,
      icon: null,
      userId: differentUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Forbidden');
  });

  it('should update project fields and return updated project', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const createdAt = new Date('2026-01-15T10:30:00.000Z');
    const updatedAt = new Date('2026-01-17T11:00:00.000Z');

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Original Project',
      color: '#FF0000',
      icon: 'folder',
      userId,
      createdAt,
      updatedAt: new Date('2026-01-15T10:30:00.000Z'),
    });

    vi.mocked(prisma.project.update).mockResolvedValue({
      id: projectId,
      name: 'Updated Project',
      color: '#00FF00',
      icon: 'star',
      userId,
      createdAt,
      updatedAt,
    });

    const token = signToken(userId);

    const response = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Project', color: '#00FF00', icon: 'star' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('project');
    expect(response.body.project).toHaveProperty('id', projectId);
    expect(response.body.project).toHaveProperty('name', 'Updated Project');
    expect(response.body.project).toHaveProperty('color', '#00FF00');
    expect(response.body.project).toHaveProperty('icon', 'star');
    expect(response.body.project).toHaveProperty('userId', userId);

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: projectId },
      data: { name: 'Updated Project', color: '#00FF00', icon: 'star' },
    });
  });

  it('should update only provided fields', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const createdAt = new Date('2026-01-15T10:30:00.000Z');
    const updatedAt = new Date('2026-01-17T11:00:00.000Z');

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Original Project',
      color: '#FF0000',
      icon: 'folder',
      userId,
      createdAt,
      updatedAt: new Date('2026-01-15T10:30:00.000Z'),
    });

    vi.mocked(prisma.project.update).mockResolvedValue({
      id: projectId,
      name: 'Updated Name Only',
      color: '#FF0000',
      icon: 'folder',
      userId,
      createdAt,
      updatedAt,
    });

    const token = signToken(userId);

    const response = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name Only' });

    expect(response.status).toBe(200);
    expect(response.body.project).toHaveProperty('name', 'Updated Name Only');

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: projectId },
      data: { name: 'Updated Name Only' },
    });
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id';

    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/projects/:id', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app)
      .delete('/api/projects/some-project-id');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .delete('/api/projects/some-project-id')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should verify project belongs to user and return 404 if not found', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'nonexistent-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project not found');
  });

  it('should verify project belongs to user and return 403 if user_id does not match', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const differentUserId = 'different-user-id-456';
    const projectId = 'test-project-id';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: null,
      icon: null,
      userId: differentUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Forbidden');
  });

  it('should delete project and return 204 no content', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: '#FF0000',
      icon: 'folder',
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.project.delete).mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      color: '#FF0000',
      icon: 'folder',
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    expect(prisma.project.delete).toHaveBeenCalledWith({
      where: { id: projectId },
    });
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('../db/prisma.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id';

    vi.mocked(prisma.project.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
  });
});
