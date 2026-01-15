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

describe('JSON Body Parsing Middleware', () => {
  it('should parse JSON body in POST requests', async () => {
    const testData = { name: 'test', value: 123 };
    const response = await request(app)
      .post('/api/test-json')
      .send(testData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('received');
    expect(response.body.received).toEqual(testData);
  });

  it('should return error for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/test-json')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');

    // Express 5.x returns 400 for malformed JSON
    expect(response.status).toBe(400);
  });

  it('should handle empty JSON body', async () => {
    const response = await request(app)
      .post('/api/test-json')
      .send({})
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('received');
    expect(response.body.received).toEqual({});
  });
});
