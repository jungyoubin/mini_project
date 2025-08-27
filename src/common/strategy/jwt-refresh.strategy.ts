import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';

type RefreshPayload = {
  sub: string; // profile_id
};
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Bearer <token>
      secretOrKey: configService.get<string>('jwt.secret') || 'default_secret',
      passReqToCallback: true, // req를 validate에 전달
    });
  }

  validate(req: Request, payload: RefreshPayload) {
    // 헤더에서 원본 토큰 가져옴(Redis 비교하기 위해서)
    const tokenExtractor = ExtractJwt.fromAuthHeaderAsBearerToken();
    const refreshToken = tokenExtractor(req) || '';

    if (!payload?.sub) {
      throw new UnauthorizedException('No refresh token');
    }

    // req.user에 보내질 부분(controller에서 바로 사용함)
    return {
      profile_id: payload.sub,
      refreshToken, // 원본 문자열
    };
  }
}
