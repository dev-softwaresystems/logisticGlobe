type CsvValue = string | number | boolean | null | undefined;
export function csvCell(value: CsvValue): string {
  let text = String(value ?? '');
  const prefix = text.trimStart();
  let index = 0;
  while (index < prefix.length && prefix.charCodeAt(index) <= 32) index++;
  if (index < prefix.length && '=+@-'.includes(prefix[index]))
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function csv(headers: string[], rows: CsvValue[][]): string {
  return (
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') +
    '\r\n'
  );
}
