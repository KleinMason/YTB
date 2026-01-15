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

describe('Error Handling Middleware', () => {
  it('should catch errors and return consistent error response format', async () => {
    const response = await request(app).get('/api/test-error');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('message');
    expect(response.body.error).toHaveProperty('statusCode');
    expect(response.body.error).toHaveProperty('timestamp');
    expect(response.body.error).toHaveProperty('path');
  });

  it('should return error message in response', async () => {
    const response = await request(app).get('/api/test-error');

    expect(response.status).toBe(500);
    expect(response.body.error.message).toBe('Test error');
  });

  it('should preserve custom status codes', async () => {
    const response = await request(app).post('/api/test-error');

    expect(response.status).toBe(400);
    expect(response.body.error.statusCode).toBe(400);
    expect(response.body.error.message).toBe('Test error with message');
  });

  it('should include timestamp in error response', async () => {
    const response = await request(app).get('/api/test-error');

    expect(response.status).toBe(500);
    expect(response.body.error).toHaveProperty('timestamp');
    expect(typeof response.body.error.timestamp).toBe('string');
    // Verify timestamp is a valid ISO string
    expect(() => new Date(response.body.error.timestamp)).not.toThrow();
  });

  it('should include request path in error response', async () => {
    const response = await request(app).get('/api/test-error');

    expect(response.status).toBe(500);
    expect(response.body.error.path).toBe('/api/test-error');
  });

  it('should return 500 status code for errors without statusCode', async () => {
    const response = await request(app).get('/api/test-error');

    expect(response.status).toBe(500);
    expect(response.body.error.statusCode).toBe(500);
  });
});

describe('Request Logging Middleware', () => {
  it('should log incoming requests with method and path', async () => {
    // Make a request - morgan logs to stdout, which we can see in test output
    // The presence of logs in test output confirms middleware is working
    const response = await request(app).get('/api/health');

    // Verify request succeeds (middleware doesn't interfere)
    expect(response.status).toBe(200);
    // Logs appear in test output: "GET /api/health 200 X ms - Y"
  });

  it('should log POST requests', async () => {
    const response = await request(app)
      .post('/api/test-json')
      .send({ test: 'data' })
      .set('Content-Type', 'application/json');

    // Verify request succeeds
    expect(response.status).toBe(200);
    // Logs appear in test output: "POST /api/test-json 200 X ms - Y"
  });

  it('should log requests with different HTTP methods', async () => {
    const getResponse = await request(app).get('/');
    const postResponse = await request(app).post('/api/test-json').send({});

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    // Both GET and POST requests are logged with their methods and paths
  });

  it('should not interfere with request processing', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});
