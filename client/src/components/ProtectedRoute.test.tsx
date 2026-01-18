import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

const mockUser = {
  id: '1',
  email: 'test@example.com',
};
const mockToken = 'test-token';

function ProtectedContent() {
  return <div>Protected Content</div>;
}

function LoginPage() {
  return <div>Login Page</div>;
}

const routes = [
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <ProtectedContent />
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
];

function renderWithProviders(initialEntries: string[] = ['/']) {
  const router = createMemoryRouter(routes, { initialEntries });
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('checks if user is authenticated', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));

    renderWithProviders();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to login if not authenticated', () => {
    renderWithProviders();

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children if authenticated', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));

    renderWithProviders();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('does not render children if only token is present', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, mockToken);

    renderWithProviders();

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('does not render children if only user is present', () => {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));

    renderWithProviders();

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
