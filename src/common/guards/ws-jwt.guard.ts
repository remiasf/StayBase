import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('User not authorized');
    }

    try {
      const user = await this.jwtService.verifyAsync(token);
      client.data.user = user;
      return true;
    } catch {
      throw new WsException('Token is invalid or expired');
    }
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    const fromHeader = client.handshake.headers?.authorization as string | undefined;
    const fromCookie = this.getCookieValue(
      client.handshake.headers?.cookie,
      'access_token',
    );

    const raw = fromAuth ?? fromHeader ?? fromCookie;
    if (!raw) {
      return null;
    }

    return raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  }

  private getCookieValue(
    cookieHeader: string | undefined,
    name: string,
  ): string | undefined {
    if (!cookieHeader) {
      return undefined;
    }

    const match = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));

    if (!match) {
      return undefined;
    }

    return decodeURIComponent(match.slice(name.length + 1));
  }
}
