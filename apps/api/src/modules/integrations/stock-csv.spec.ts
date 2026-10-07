import { parseStockCsv } from './stock-csv.js';
const header =
  'externalId,version,observedAt,warehouseCode,sku,quantity,minimumQuantity,expectedUpdatedAt';
describe('Reference stock CSV', () => {
  it('preserves quoted identifiers and numeric types', () => {
    expect(
      parseStockCsv(
        header +
          '\r\n"pedido,uno",1,2026-10-07T12:00:00Z,ALM,SKU,2,5,2026-10-07T11:00:00Z',
      ),
    ).toEqual([
      {
        externalId: 'pedido,uno',
        version: 1,
        observedAt: '2026-10-07T12:00:00Z',
        warehouseCode: 'ALM',
        sku: 'SKU',
        quantity: 2,
        minimumQuantity: 5,
        expectedUpdatedAt: '2026-10-07T11:00:00Z',
      },
    ]);
  });
  it('rejects malformed input, unknown headers and limits', () => {
    for (const text of [
      'wrong\nheader',
      header + '\n"unclosed',
      header + '\na,b',
      header + '\n' + Array(502).fill('a').join(''),
    ])
      expect(() => parseStockCsv(text)).toThrow();
  });
  it('does not coerce invalid numeric content into zero', () => {
    const rows = parseStockCsv(
      header + '\nX,1,2026-10-07T12:00:00Z,ALM,SKU,,5,2026-10-07T11:00:00Z',
    ) as { quantity: unknown }[];
    expect(rows[0].quantity).toBe('');
  });
});
