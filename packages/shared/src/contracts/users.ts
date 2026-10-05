import type { CurrentUser, RoleName } from './dashboard.js';
export interface ManagedUser extends CurrentUser {
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  roles: RoleName[];
}
export interface UpdateUserInput {
  name: string;
  active: boolean;
  roles: RoleName[];
  expectedUpdatedAt: string;
}
export interface UserAudit {
  id: string;
  actorId: string;
  action: string;
  createdAt: string;
  changes: { active?: boolean; roles?: RoleName[]; nameChanged?: boolean };
}
