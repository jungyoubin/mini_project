import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadDto } from './jwt-dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 헤더에서 accesstoken 추출
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'default_secret',
    });
  }
  // payload 리턴할때 이 구조로 return
  // req.user에는 이 3개가 들어온다
  validate(payload: JwtPayloadDto) {
    console.log('JWT payload:', payload);

    return {
      profile_id: payload.profile_id ?? payload.sub,
      user_name: payload.user_name ?? null,
    };
  }
}
