import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function TestComponent() {
  const { user, token, isAuthenticated, login, logout } = useAuth();

  return (
    <div>
      <span data-testid="user">{user ? JSON.stringify(user) : 'null'}</span>
      <span data-testid="token">{token || 'null'}</span>
      <span data-testid="isAuthenticated">{isAuthenticated.toString()}</span>
      <button
        data-testid="login-btn"
        onClick={() => login({ id: '123', email: 'test@example.com' }, 'test-token')}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('AuthProvider', () => {
    it('should provide initial null state for user and token when localStorage is empty', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    it('should update user and token when login is called', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        screen.getByTestId('login-btn').click();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('{"id":"123","email":"test@example.com"}');
      expect(screen.getByTestId('token')).toHaveTextContent('test-token');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    it('should clear user and token when logout is called', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        screen.getByTestId('login-btn').click();
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');

      act(() => {
        screen.getByTestId('logout-btn').click();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    it('should set isAuthenticated to true only when both user and token exist', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');

      act(() => {
        screen.getByTestId('login-btn').click();
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });
  });

  describe('useAuth', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleError = console.error;
      console.error = () => {};

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = consoleError;
    });
  });

  describe('localStorage persistence', () => {
    it('should save token to localStorage on login', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        screen.getByTestId('login-btn').click();
      });

      expect(localStorage.getItem('auth_token')).toBe('test-token');
    });

    it('should save user to localStorage on login', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        screen.getByTestId('login-btn').click();
      });

      expect(localStorage.getItem('auth_user')).toBe('{"id":"123","email":"test@example.com"}');
    });

    it('should load token from localStorage on app init', () => {
      localStorage.setItem('auth_token', 'stored-token');
      localStorage.setItem('auth_user', '{"id":"456","email":"stored@example.com"}');

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('token')).toHaveTextContent('stored-token');
    });

    it('should load user from localStorage on app init', () => {
      localStorage.setItem('auth_token', 'stored-token');
      localStorage.setItem('auth_user', '{"id":"456","email":"stored@example.com"}');

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('user')).toHaveTextContent('{"id":"456","email":"stored@example.com"}');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    it('should clear token from localStorage on logout', () => {
      localStorage.setItem('auth_token', 'stored-token');
      localStorage.setItem('auth_user', '{"id":"456","email":"stored@example.com"}');

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        screen.getByTestId('logout-btn').click();
      });

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });
  });
});
