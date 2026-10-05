import type {
  Page,
  ManagedUser,
  RoleName,
  CreateUserInput,
  UpdateUserInput,
  UserAudit,
} from '@logistics-globe/shared';
import { http } from '../../../services/http';
export const listUsers = async (query: {
  page: number;
  search: string;
  state: string;
}) =>
  (
    await http.get<Page<ManagedUser>>('/users', {
      params: {
        ...query,
        state: query.state || undefined,
        search: query.search || undefined,
      },
    })
  ).data;
export const listRoles = async () =>
  (await http.get<RoleName[]>('/users/roles')).data;
export const createUser = async (input: CreateUserInput) =>
  (await http.post<ManagedUser>('/users', input)).data;
export const updateUser = async ({
  id,
  ...input
}: UpdateUserInput & { id: string }) =>
  (await http.patch<ManagedUser>('/users/' + id, input)).data;
export const getUserAudit = async (id: string, page = 1) =>
  (
    await http.get<Page<UserAudit>>('/users/' + id + '/audit', {
      params: { page },
    })
  ).data;
