import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const user = client.data?.user as { sub?: string; exp?: number } | undefined;

    // 미들웨어가 넣어준 payload가 없다 -> 인증 실패
    if (!user?.sub) {
      throw new UnauthorizedException('No authenti~~ (no user on socket)');
    }

    const authHeader = client.handshake?.headers?.authorization;
    if (!authHeader) throw new UnauthorizedException('Authorization header가 없다');

    return true;
  }
}
