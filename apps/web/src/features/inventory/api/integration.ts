import type { ImportResult } from '@logistics-globe/shared';
import { http } from '../../../services/http';
export const importReferenceCsv = async (csv: string) =>
  (
    await http.post<{ mode: 'local-reference'; results: ImportResult[] }>(
      '/integrations/reference/stock.csv',
      { csv },
    )
  ).data;
