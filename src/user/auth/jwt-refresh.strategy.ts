import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { StrategyOptionsWithRequest } from 'passport-jwt';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'default_secret',
      passReqToCallback: true,
    };
    super(options);
  }

  async validate(req: Request, payload: any) {
    // 필요한 경우 req에서 쿠키나 헤더 검사 가능
    return { id: payload.sub, username: payload.username };
  }
}
