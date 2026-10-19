import { describe, expect, it } from 'vitest';
import { toCsv } from './csv.ts';

describe('toCsv', () => {
  it('joins cells with commas and rows with CRLF', () => {
    expect(toCsv([['a', 'b'], [1, null]])).toBe('a,b\r\n1,');
  });

  it('quotes cells holding commas or quotes and doubles the quotes', () => {
    expect(toCsv([['Tuchet, & "Sons"']])).toBe('"Tuchet, & ""Sons"""');
  });

  it('defuses cells a spreadsheet would run as a formula', () => {
    expect(toCsv([['=SUM(A1)']])).toBe("'=SUM(A1)");
  });
});
