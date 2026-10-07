import { BadRequestException } from '@nestjs/common';
const headers = [
  'externalId',
  'version',
  'observedAt',
  'warehouseCode',
  'sku',
  'quantity',
  'minimumQuantity',
  'expectedUpdatedAt',
];
export function parseStockCsv(input: string): unknown[] {
  if (Buffer.byteLength(input) > 95000)
    throw new BadRequestException('CSV exceeds 95000 bytes');
  const rows: string[][] = [];
  let cells: string[] = [],
    field = '',
    quoted = false,
    closed = false;
  input = input.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === '"') {
      if (field || closed) throw new BadRequestException('Malformed CSV');
      quoted = true;
    } else if (char === ',' || char === '\n' || char === '\r') {
      cells.push(field);
      field = '';
      closed = false;
      if (char !== ',') {
        if (char === '\r' && input[i + 1] === '\n') i++;
        rows.push(cells);
        cells = [];
      }
    } else {
      if (closed) throw new BadRequestException('Malformed CSV');
      field += char;
    }
    if (field.length > 500) throw new BadRequestException('CSV cell too long');
    if (rows.length > 101 || cells.length > 8)
      throw new BadRequestException('CSV exceeds limits');
  }
  if (quoted) throw new BadRequestException('Unclosed CSV quote');
  if (field || cells.length) {
    cells.push(field);
    rows.push(cells);
  }
  if (rows[0]?.join(',') !== headers.join(',') || rows.length < 2)
    throw new BadRequestException(
      'CSV headers must match the reference stock contract',
    );
  return rows.slice(1).map((row) => {
    if (row.length !== headers.length)
      throw new BadRequestException('CSV column count mismatch');
    return Object.fromEntries(
      headers.map((key, i) => [
        key,
        ['version', 'quantity', 'minimumQuantity'].includes(key) &&
        /^[0-9]+$/.test(row[i])
          ? Number(row[i])
          : row[i],
      ]),
    );
  });
}
