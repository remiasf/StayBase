import { Role } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  login: string;
  role: Role;
};

export type AuthUser = {
  id: string;
  login: string;
  role: Role;
};

export function toAuthUser(payload: unknown): AuthUser | null {
  const { sub, login, role } = (payload ?? {}) as Partial<JwtPayload>;

  if (typeof sub !== 'string' || !sub) {
    return null;
  }

  return { id: sub, login: login as string, role: role as Role };
}
