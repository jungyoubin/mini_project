import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { StrategyOptionsWithRequest } from 'passport-jwt';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([(req: Request) => req.cookies?.refresh_token]),
      secretOrKey: process.env.JWT_SECRET || 'default_secret',
      passReqToCallback: true,
    };
    super(options);
  }

  async validate(req: Request, payload: any) {
    return { id: payload.sub, username: payload.username };
  }
}
