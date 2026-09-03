import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthUser, toAuthUser } from './jwt-user';

export function extractSocketToken(client: Socket): string | null {
  const raw =
    (client.handshake.auth?.token as string | undefined) ??
    (client.handshake.headers?.authorization as string | undefined) ??
    getCookieValue(client.handshake.headers?.cookie, 'access_token');

  if (!raw) {
    return null;
  }

  return raw.startsWith('Bearer ') ? raw.slice(7) : raw;
}

export async function authenticateSocket(
  jwtService: JwtService,
  client: Socket,
): Promise<AuthUser> {
  const cached = client.data.user as AuthUser | undefined;
  if (cached) {
    return cached;
  }

  const token = extractSocketToken(client);
  if (!token) {
    throw new WsException('User not authorized');
  }

  let user: AuthUser | null;
  try {
    user = toAuthUser(await jwtService.verifyAsync(token));
  } catch {
    throw new WsException('Token is invalid or expired');
  }

  if (!user) {
    throw new WsException('User not authorized');
  }

  client.data.user = user;
  return user;
}

export function getSocketUser(client: Socket): AuthUser {
  const user = client.data.user as AuthUser | undefined;

  if (!user?.id) {
    throw new WsException('User not authorized');
  }

  return user;
}

function getCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  const match = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}
