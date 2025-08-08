import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadDto } from './jwt-dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Bearer <token>
      secretOrKey: configService.get<string>('jwt.secret') || 'default_secret',
      passReqToCallback: true,
    });
  }

  async validate(payload: JwtPayloadDto) {
    return {
      profile_id: payload.profile_id,
      user_name: payload.user_name,
      access_token: payload.access_token,
    };
  }
}
