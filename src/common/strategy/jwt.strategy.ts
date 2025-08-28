import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadDto } from '../payload/jwt-dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Authorization: Bearer <token>
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') || 'default_secret',
    });
  }
  validate(payload: JwtPayloadDto): JwtPayloadDto {
    // req.user 에 JWT payload 그대로 넣어줌 → user.sub 사용 유지
    return payload;
  }
}
