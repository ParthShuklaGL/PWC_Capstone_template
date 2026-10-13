import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from './format.ts';

describe('formatDate', () => {
  it('writes a deal date as 12 Oct 2026, the same calendar day whatever the time zone', () => {
    expect(formatDate('2026-10-12')).toBe('12 Oct 2026');
    expect(formatDate('2027-01-01')).toBe('1 Jan 2027');
  });

  it('writes a timestamp the same way', () => {
    expect(formatDate('2026-07-14T09:44:16.34765Z')).toBe('14 Jul 2026');
  });
});

describe('formatMoney', () => {
  it('writes GBP with two decimals', () => {
    expect(formatMoney(46850.5)).toBe('£46,850.50');
  });
});
