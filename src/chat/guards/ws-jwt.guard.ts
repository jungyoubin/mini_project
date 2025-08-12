import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard extends (AuthGuard('jwt') as { new (): CanActivate }) {
  // WS 컨텍스트용으로 Request 대체
  getRequest(context: ExecutionContext) {
    const client = context.switchToWs().getClient<Socket>();
    // 1) socket.auth.token  2) Authorization 헤더(Bearer ...)
    const raw =
      (client.handshake as any)?.auth?.token || client.handshake.headers?.authorization || '';

    // passport-jwt가 읽을 수 있도록 header 형식으로 만들어 반환
    const authorization =
      typeof raw === 'string' && !raw.toLowerCase().startsWith('bearer ') ? `Bearer ${raw}` : raw;

    return { headers: { authorization } } as any;
  }

  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    if (err || !user) throw err || new UnauthorizedException();
    // 통과 시 소켓에 user를 심어두면 게이트웨이에서 바로 사용 가능
    const client = context.switchToWs().getClient<Socket>();
    (client as any).user = user;
    return user;
  }
}
