import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the app with layout', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('YTB');
  });

  it('renders the welcome message', () => {
    render(<App />);
    expect(screen.getByText('Welcome to YTB - Your daily standup tracker')).toBeInTheDocument();
  });
});
