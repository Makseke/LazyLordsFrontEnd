import { render, screen } from '@testing-library/react';
import Join from './Join';

test('renders learn react link', () => {
  render(<Join />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
