import { afterEach, expect, it, vi } from 'vitest';
import { http } from '../../../services/http';
import { downloadReport } from './reports';
vi.mock('../../../services/http', () => ({ http: { get: vi.fn() } }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('prepares a CSV download with the API blob, filters and an explicit filename', async () => {
  const blob = new Blob(['Referencia,Estado\r\nENV-001,PENDING'], {
    type: 'text/csv',
  });
  vi.mocked(http.get).mockResolvedValue({ data: blob });
  const make = vi.fn().mockReturnValue('blob:local-test');
  const revoke = vi.fn();
  const originalURL = globalThis.URL;
  class DownloadURL extends originalURL {
    static override createObjectURL = make;
    static override revokeObjectURL = revoke;
  }
  vi.stubGlobal('URL', DownloadURL);
  let downloadName = '';
  let attached = false;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloadName = this.download;
    attached = document.body.contains(this);
  });
  await downloadReport('shipments', { status: 'PENDING' });
  expect(http.get).toHaveBeenCalledWith('/reports/shipments.csv', {
    params: { status: 'PENDING' },
    responseType: 'blob',
  });
  expect(make).toHaveBeenCalledWith(blob);
  expect(downloadName).toBe('shipments.csv');
  expect(attached).toBe(true);
});
