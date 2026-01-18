import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, apiGet, apiPost, apiPut, apiDelete } from './api';

describe('API Client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('api function', () => {
    it('should make GET request to correct URL with base URL prefix', async () => {
      const mockResponse = { id: 1, name: 'Test' };
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await api('/users/1');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/users/1',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should include Content-Type: application/json header', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await api('/users');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should return data on successful response', async () => {
      const mockData = { id: 1, name: 'Test' };
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await api('/users/1');

      expect(result).toEqual({ data: mockData });
    });

    it('should return error on failed response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      } as Response);

      const result = await api('/users/999');

      expect(result).toEqual({ error: 'Not found' });
    });

    it('should return generic error message when error field is missing', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      } as Response);

      const result = await api('/users/999');

      expect(result).toEqual({ error: 'An error occurred' });
    });

    it('should return network error on fetch failure', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'));

      const result = await api('/users');

      expect(result).toEqual({ error: 'Network error' });
    });

    it('should send JSON body for POST requests', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      } as Response);

      const body = { name: 'New User', email: 'test@example.com' };
      await api('/users', { method: 'POST', body });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });

    it('should merge custom headers with default headers', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await api('/users', {
        headers: { Authorization: 'Bearer token123' },
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token123',
          },
        })
      );
    });

    it('should read token from localStorage and add Authorization header', async () => {
      localStorage.setItem('auth_token', 'stored-jwt-token');
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await api('/users');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer stored-jwt-token',
          },
        })
      );
    });

    it('should not add Authorization header if no token exists', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await api('/users');

      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
      const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('should not override custom Authorization header with stored token', async () => {
      localStorage.setItem('auth_token', 'stored-token');
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await api('/users', {
        headers: { Authorization: 'Bearer custom-token' },
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer custom-token',
          },
        })
      );
    });
  });

  describe('apiGet', () => {
    it('should make GET request', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      await apiGet('/users');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('apiPost', () => {
    it('should make POST request with body', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      } as Response);

      const body = { name: 'Test' };
      await apiPost('/users', body);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('apiPut', () => {
    it('should make PUT request with body', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      } as Response);

      const body = { name: 'Updated' };
      await apiPut('/users/1', body);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('apiDelete', () => {
    it('should make DELETE request', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await apiDelete('/users/1');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/users/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
