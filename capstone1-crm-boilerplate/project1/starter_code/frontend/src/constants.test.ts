import { describe, expect, it } from 'vitest';
import { formatDate, formatStatus } from './constants.ts';

describe('formatStatus', () => {
  it('turns the wire name into a label', () => {
    expect(formatStatus('CUSTOMER')).toBe('Customer');
    expect(formatStatus('PROSPECT')).toBe('Prospect');
    expect(formatStatus('CHURNED')).toBe('Churned');
  });
});

describe('formatDate', () => {
  it('shows a dash when there is no date', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('shows a dash when the date cannot be read', () => {
    expect(formatDate('not a date')).toBe('—');
  });

  it('formats an ISO date for a UK reader', () => {
    expect(formatDate('2026-03-18T12:00:00Z')).toBe('18 Mar 2026');
  });
});
