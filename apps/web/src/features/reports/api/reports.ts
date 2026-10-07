import type { ShipmentFilters } from '@logistics-globe/shared';
import { http } from '../../../services/http';
export async function downloadReport(
  name: 'shipments' | 'inventory',
  params: ShipmentFilters = {},
): Promise<void> {
  const { data } = await http.get<Blob>('/reports/' + name + '.csv', {
    params,
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name + '.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadExecutiveReport(
  format: 'pdf' | 'xlsx',
  params: {
    from?: string;
    to?: string;
    status?: string;
    priority?: string;
  } = {},
): Promise<void> {
  const { data } = await http.get<Blob>('/reports/dashboard.' + format, {
    params,
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data),
    anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'LogisticsGlobe-dashboard.' + format;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
