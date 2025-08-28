import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UserService } from '../../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  // redis에 원문 저장하지 않기 -> redis가 해킹당하면 그대로 보여주기 때문에
  // 검증 받을때, 사용자가 가지고 있는 RT를 sha256 해서 redis에 있는것과 비교진행하기
  private sha256(s: string) {
    return createHash('sha256').update(s).digest('hex');
  }


  // 로그아웃시 redis 삭제
  async logout(profile_id: string) {
    await this.redis.del(`rt:${profile_id}`);
    return { message: '로그아웃 완료' };
  }

  // 유저별 키의 해시와 비교하기
  async reissueAccessToken(
    refreshToken: string,
    payloadFromGuard: { profile_id: string; user_name?: string },
  ) {
    try {
      // Redis에서 사용자별 저장된 refresh 토큰 가져와 비교
      const key = `rt:${payloadFromGuard.profile_id}`;
      const storedHash = await this.redis.get(key);

      if (!storedHash || storedHash !== this.sha256(refreshToken)) {
        throw new UnauthorizedException('유효하지 않은 refresh token');
      }

      // 새로운 AT 발급
      const accessTTL = this.configService.get<string>('jwt.accessTTL', '1h');
      const newAccessToken = this.jwtService.sign(
        { sub: payloadFromGuard.profile_id, user_name: payloadFromGuard.user_name },
        { expiresIn: accessTTL },
      );

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('refresh token이 만료되었거나 유효하지 않습니다.');
    }
  }
}
