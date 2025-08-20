import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { JwtPayloadDto } from '../../user/auth/jwt-dto';

export function wsHandshakeAuth(jwt: JwtService, config: ConfigService) {
  return (socket: Socket, next: (err?: Error) => void) => {
    try {
      const raw = socket.handshake?.headers?.authorization;
      if (!raw) return next(new Error('Unauthorized: missing Authorization header'));

      const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
      const payload = jwt.verify<JwtPayloadDto>(token, {
        secret: config.get<string>('jwt.secret'),
      });

      socket.data.user = payload;
      return next();
    } catch {
      return next(new Error('Unauthorized: invalid/expired token'));
    }
  };
}
