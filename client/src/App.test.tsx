import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  it('renders the heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Vite + React');
  });

  it('renders the counter button with initial count of 0', () => {
    render(<App />);
    expect(screen.getByRole('button')).toHaveTextContent('count is 0');
  });

  it('increments the counter when button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(button).toHaveTextContent('count is 1');
  });
});
