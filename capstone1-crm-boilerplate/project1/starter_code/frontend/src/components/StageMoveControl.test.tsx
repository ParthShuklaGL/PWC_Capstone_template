import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StageMoveControl from './StageMoveControl.tsx';
import * as crm from '../api/crm.ts';
import type { Deal } from '../types.ts';

vi.mock('../api/crm.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/crm.ts')>()),
  moveDealStage: vi.fn(),
}));

const deal: Deal = {
  dealRef: 'D-00016',
  title: 'Procurement automation',
  value: 145000,
  currency: 'GBP',
  expectedCloseDate: '2026-12-01',
  stage: 'NEGOTIATION',
  closedDate: null,
  lostReason: null,
  accountRef: 'A-0008',
  accountName: 'Tuchet & Sons',
  contactRef: 'C-00001',
  contactName: 'Ada Lovelace',
  contactStatus: 'PROSPECT',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function setup(overrides: Partial<Deal> = {}, onMoved = vi.fn()) {
  render(
    <MemoryRouter>
      <StageMoveControl deal={{ ...deal, ...overrides }} onMoved={onMoved} />
    </MemoryRouter>,
  );
  return onMoved;
}

describe('StageMoveControl', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('AC_05_ClosedDealExplainsItIsFinal', () => {
    setup({ stage: 'WON' });
    expect(screen.getByRole('status')).toHaveTextContent(/closed deals are final/i);
    expect(screen.queryByRole('button', { name: 'Move deal' })).not.toBeInTheDocument();
  });

  it('AC_05_OffersOnlyReasonableMoves', () => {
    setup({ stage: 'PROSPECTING' });
    const options = within(screen.getByLabelText('Move to')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Choose a stage…', 'Qualified', 'Lost']);
  });

  it('AC_05_WinningAsksForACloseDateAndSendsIt', async () => {
    vi.mocked(crm.moveDealStage).mockResolvedValue({ ...deal, stage: 'WON' });
    const onMoved = setup();

    await userEvent.selectOptions(screen.getByLabelText('Move to'), 'WON');
    expect(screen.getByLabelText('Close date')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Move deal' }));

    expect(crm.moveDealStage).toHaveBeenCalledWith(
      'D-00016',
      expect.objectContaining({ stage: 'WON', closeDate: expect.any(String) }),
    );
    expect(onMoved).toHaveBeenCalledWith(expect.objectContaining({ stage: 'WON' }));
  });

  it('AC_05_RefusedMoveShowsTheServersMessage', async () => {
    vi.mocked(crm.moveDealStage).mockRejectedValue(
      new crm.ApiError(
        409,
        { error: 'DEAL_STAGE_TRANSITION_INVALID', message: 'A deal moves forward one stage at a time.' },
        'refused',
      ),
    );
    const onMoved = setup();

    await userEvent.selectOptions(screen.getByLabelText('Move to'), 'PROPOSAL');
    await userEvent.click(screen.getByRole('button', { name: 'Move deal' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A deal moves forward one stage at a time.',
    );
    expect(onMoved).not.toHaveBeenCalled();
  });

  it('AC_05_LosingWithoutAReasonShowsTheFieldError', async () => {
    vi.mocked(crm.moveDealStage).mockRejectedValue(
      new crm.ApiError(
        400,
        { error: 'VALIDATION_FAILED', fields: { lostReason: 'lostReason is required' } },
        'invalid',
      ),
    );
    setup();

    await userEvent.selectOptions(screen.getByLabelText('Move to'), 'LOST');
    await userEvent.click(screen.getByRole('button', { name: 'Move deal' }));

    expect(await screen.findByText('lostReason is required')).toBeInTheDocument();
  });
});
