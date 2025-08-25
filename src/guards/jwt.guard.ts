import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayloadDto } from 'src/user/auth/jwt-dto';

// Access Token 검증 하는 Guard
@Injectable()
export class HttpJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /* 
  Authorization 헤더에서 Bearer 토큰 추출
  token 서명 검증 이후, payload 얻기
  controller에 쓸 수 있게 req.user에 넣기
  */

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();

    // Auth 헤더 확인하기
    const auth = req.headers?.authorization as string | undefined;
    if (!auth) {
      // 헤더 없으면
      throw new UnauthorizedException('Missing Authorization header');
    }

    // Bearer 에서 Token만 분리
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;

    if (!token) {
      // Bearer 없으면
      throw new UnauthorizedException('Invalid Authorization header');
    }

    try {
      // 서명
      const payload = this.jwt.verify<JwtPayloadDto>(token, {
        secret: this.config.get<string>('jwt.secret'),
      });

      req.user = payload; // 이후 컨트롤러에서 req.user.sub 사용
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
