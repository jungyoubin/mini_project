import { AuthGuard } from '@nestjs/passport';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
// AuthGuard('jwt')를 WebSocket에 맞추어서 확장한 Guard -> WsJwtGuard
export class WsJwtGuard extends (AuthGuard('jwt') as { new (): CanActivate }) {
  getRequest(context: ExecutionContext) {
    // socket.io client 가져오기
    const client = context.switchToWs().getClient<Socket>();
    // handshake시 보낸 토큰 가져오기
    // auth.token 또는 header 에서 꺼냄 -> auth.token(header는 혹시 모르니까 두기)
    const raw =
      (client.handshake as any)?.auth?.token || client.handshake.headers?.authorization || '';
    // bearere 없으면 앞에 붙이기
    const authorization =
      typeof raw === 'string' && !raw.toLowerCase().startsWith('bearer ') ? `Bearer ${raw}` : raw;
    return { headers: { authorization } } as any;
  }

  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    // user에 payload 들어감
    if (err || !user) throw err || new UnauthorizedException();
    const client = context.switchToWs().getClient<Socket>();
    (client as any).user = user; // socket 객체에 user 정보를 저장 -> gateway에서 사용가능
    return user;
  }
}
