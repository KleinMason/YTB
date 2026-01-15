import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './index.js';

describe('GET /', () => {
  it('should return API status message', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'YTB API is running');
  });

  it('should include environment in response', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('environment');
    expect(typeof response.body.environment).toBe('string');
  });
});

describe('GET /api/health', () => {
  it('should return status 200 with ok response', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('should include timestamp in response', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('timestamp');
    expect(typeof response.body.timestamp).toBe('string');
    // Verify timestamp is a valid ISO string
    expect(() => new Date(response.body.timestamp)).not.toThrow();
  });
});

describe('CORS middleware', () => {
  it('should include Access-Control-Allow-Origin header in responses', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
  });

  it('should handle preflight OPTIONS requests', async () => {
    const response = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(response.headers['access-control-allow-methods']).toBeDefined();
  });

  it('should allow cross-origin requests from frontend origin', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
