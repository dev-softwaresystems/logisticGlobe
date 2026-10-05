import { csv, csvCell } from './csv.js';
describe('Spreadsheet-safe exports', () => {
  it('escapes quotes, delimiters and lines without changing cells', () => {
    expect(csvCell('México, "Norte"\nSur')).toBe('"México, ""Norte""\nSur"');
    expect(csv(['Name', 'Qty'], [['Tarima', 12]])).toContain('"Tarima","12"');
  });
  it('neutralizes spreadsheet formulas with leading whitespace and control characters', () => {
    for (const input of [
      '=1+1',
      ' +SUM(A1)',
      '@cmd',
      '-10',
      '\t=1+1',
      '\u0000=1+1',
    ])
      expect(csvCell(input)).toMatch(/^"'[\s\S]*"$/);
    expect(csvCell('ENV-001')).toBe('"ENV-001"');
  });
});
