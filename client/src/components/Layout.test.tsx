import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from './Layout';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Layout', () => {
  it('renders the header with app title', () => {
    renderWithRouter(<Layout>Content</Layout>);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'YTB' })).toBeInTheDocument();
  });

  it('renders the main content area', () => {
    renderWithRouter(<Layout>Content</Layout>);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('renders children in the main content area', () => {
    renderWithRouter(<Layout><p>Test content</p></Layout>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies proper styling to header', () => {
    renderWithRouter(<Layout>Content</Layout>);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('bg-gray-800');
  });

  it('applies proper styling to main area', () => {
    renderWithRouter(<Layout>Content</Layout>);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('flex-1', 'bg-gray-900');
  });

  it('renders navigation links', () => {
    renderWithRouter(<Layout>Content</Layout>);
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
  });
});
