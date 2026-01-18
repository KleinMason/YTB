import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { AuthProvider } from '../contexts/AuthContext';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithProviders(ui: React.ReactElement, { authenticated = false } = {}) {
  if (authenticated) {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('auth_user', JSON.stringify({ id: '1', email: 'test@test.com' }));
  } else {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it('renders the header with app title', () => {
    renderWithProviders(<Layout>Content</Layout>);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'YTB' })).toBeInTheDocument();
  });

  it('renders the main content area', () => {
    renderWithProviders(<Layout>Content</Layout>);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('renders children in the main content area', () => {
    renderWithProviders(<Layout><p>Test content</p></Layout>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies proper styling to header', () => {
    renderWithProviders(<Layout>Content</Layout>);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('bg-gray-800');
  });

  it('applies proper styling to main area', () => {
    renderWithProviders(<Layout>Content</Layout>);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('flex-1', 'bg-gray-900');
  });

  it('renders Login and Register links when not authenticated', () => {
    renderWithProviders(<Layout>Content</Layout>, { authenticated: false });
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  });

  it('renders Logout button when authenticated', () => {
    renderWithProviders(<Layout>Content</Layout>, { authenticated: true });
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Register' })).not.toBeInTheDocument();
  });

  it('calls logout function when Logout button is clicked', () => {
    renderWithProviders(<Layout>Content</Layout>, { authenticated: true });
    const logoutButton = screen.getByRole('button', { name: 'Logout' });
    fireEvent.click(logoutButton);
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });

  it('redirects to login page when Logout button is clicked', () => {
    renderWithProviders(<Layout>Content</Layout>, { authenticated: true });
    const logoutButton = screen.getByRole('button', { name: 'Logout' });
    fireEvent.click(logoutButton);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
