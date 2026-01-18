import { render, screen } from '@testing-library/react';
import { Layout } from './Layout';

describe('Layout', () => {
  it('renders the header with app title', () => {
    render(<Layout>Content</Layout>);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('YTB');
  });

  it('renders the main content area', () => {
    render(<Layout>Content</Layout>);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('renders children in the main content area', () => {
    render(<Layout><p>Test content</p></Layout>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies proper styling to header', () => {
    render(<Layout>Content</Layout>);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('bg-gray-800');
  });

  it('applies proper styling to main area', () => {
    render(<Layout>Content</Layout>);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('flex-1', 'bg-gray-900');
  });
});
