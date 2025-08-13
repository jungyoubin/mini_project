import { Injectable, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, LoginUserDto } from 'src/user/user.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UserService } from '../user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  // redis에 원문 저장하지 않기 -> redis가 해킹당하면 그대로 보여주기 때문에
  // 검증 받을때, 사용자가 가지고 있는 RT를 sha256 해서 redis에 있는것과 비교진행하기
  private sha256(s: string) {
    return createHash('sha256').update(s).digest('hex');
  }
  // '7d'|'1h'|'30m' 등 문자열 TTL → seconds로 바꾸기
  private parseTTLToSeconds(ttl: string, fallbackSec: number): number {
    if (!ttl) return fallbackSec;
    const m = ttl.match(/^(\d+)([dhms])$/i);
    if (!m) return fallbackSec;
    const n = parseInt(m[1], 10);
    switch (m[2].toLowerCase()) {
      case 'd':
        return n * 86400;
      case 'h':
        return n * 3600;
      case 'm':
        return n * 60;
      case 's':
        return n;
      default:
        return fallbackSec;
    }
  }

  async register(userDto: CreateUserDto) {
    const user = await this.userService.findByUserId(userDto.user_id);
    if (user) {
      throw new HttpException('해당 아이디는 이미 사용중입니다.', HttpStatus.BAD_REQUEST);
    }
    try {
      const newUser = await this.userService.createUser(userDto);
      const { user_pw, ...safeUser } = newUser;
      return safeUser;
    } catch {
      throw new HttpException('서버 에러', 500);
    }
  }

  async login(loginDto: LoginUserDto) {
    const user = await this.userService.findByUserId(loginDto.user_id);
    if (!user) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }

    const isPasswordValid = await user.checkPassword(loginDto.user_pw);
    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    // TTL을 config에서 가져오기
    const accessTTL = this.configService.get<string>('jwt.accessTTL', '1h');
    const refreshTTL = this.configService.get<string>('jwt.refreshTTL', '7d');

    // req.user에서 사용하고 싶은 값은 payload에 넣어두자 -> profile_id, user_name
    const payload = { sub: user.profile_id, user_name: user.user_name };

    // accessToken
    const accessToken = this.jwtService.sign(payload, { expiresIn: accessTTL });

    // refreshToken
    const refreshToken = this.jwtService.sign(payload, { expiresIn: refreshTTL });

    // refreshToken -> 유저당 1개만 저장하기
    const key = `rt:${user.profile_id}`;
    const refreshSec = this.parseTTLToSeconds(refreshTTL, 7 * 24 * 60 * 60); // 7일
    await this.redis.set(key, this.sha256(refreshToken), 'EX', refreshSec);

    return {
      message: '로그인 성공',
      profile: user.profile_id,
      user_id: user.user_id,
      user_name: user.user_name,
      accessToken,
      refreshToken,
    };
  }

  // 로그아웃시 삭제
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
