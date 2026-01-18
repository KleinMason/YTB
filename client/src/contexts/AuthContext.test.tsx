import { describe, it, expect } from 'vitest';
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
  describe('AuthProvider', () => {
    it('should provide initial null state for user and token', () => {
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
});
