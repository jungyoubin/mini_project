import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const user = client.data?.user as { sub?: string; exp?: number } | undefined;

    if (!user?.sub) {
      throw new UnauthorizedException('No authenti~~ (no user on socket)');
    }

    const authHeader = client.handshake?.headers?.authorization;
    if (!authHeader) throw new UnauthorizedException('Authorization header가 없다');

    // 만료 확인
    if (user.exp && Math.floor(Date.now() / 1000) >= user.exp) {
      try {
        client.disconnect(true);
      } catch {}
      throw new UnauthorizedException('Token expired');
    }
    return true;
  }
}
