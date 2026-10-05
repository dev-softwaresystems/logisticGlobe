import type { RoleName } from '@logistics-globe/shared';
import { useSession } from './use-session';
export function usePermission(roles: RoleName[]): boolean {
  const { data: user } = useSession();
  return !!user?.roles.some((role) => roles.includes(role));
}
