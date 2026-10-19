import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination.tsx';

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination page={0} totalPages={1} totalElements={12} onChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('disables Previous on the first page', () => {
    render(<Pagination page={0} totalPages={3} totalElements={60} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('disables Next on the last page', () => {
    render(<Pagination page={2} totalPages={3} totalElements={60} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('asks for the next page when Next is clicked', async () => {
    const onChange = vi.fn();
    render(<Pagination page={0} totalPages={3} totalElements={60} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
