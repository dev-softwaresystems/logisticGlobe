import { useQuery } from '@tanstack/react-query';
import { restoreSession } from '../api/auth';
export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: restoreSession,
    staleTime: Infinity,
    retry: false,
  });
}
