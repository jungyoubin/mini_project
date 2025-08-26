import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { JwtPayloadDto } from '../../common/payload/jwt-dto';

/* 
소켓 핸드셰이크 단계에서 실행되는 미들웨어
토큰 추출 -> 검증 -> paylaod를 socket.data.user에 주입 
*/
export function wsHandshakeAuth(jwt: JwtService, config: ConfigService) {
  return (socket: Socket, next: (err?: Error) => void) => {
    try {
      const raw = socket.handshake?.headers?.authorization as string | undefined;
      if (!raw) return next(new Error('Unauthorized: missing Authorization header'));

      // bearer 분리
      const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

      // 검증
      const payload = jwt.verify<JwtPayloadDto>(token, {
        secret: config.get<string>('jwt.secret'),
      });

      // 저장
      socket.data.user = payload;
      return next();
    } catch (e) {
      return next(new Error('Unauthorized: invalid/expired token'));
    }
  };
}
