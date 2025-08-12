import { Injectable, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, LoginUserDto } from 'src/user/user.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UserService } from '../user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async register(userDto: CreateUserDto) {
    const user = await this.userService.findByUserId(userDto.user_id);
    if (user) {
      throw new HttpException('해당 아이디는 이미 사용중입니다.', HttpStatus.BAD_REQUEST);
    }
    try {
      const newUser = await this.userService.createUser(userDto);
      const { user_pw, ...safeUser } = newUser;
      return safeUser;
    } catch (error) {
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

    const accessToken = this.jwtService.sign(payload, { expiresIn: accessTTL });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: refreshTTL });

    // redis 저장
    await this.redis.set('rt:${user.profile_id}', refreshToken, 'EX', 7 * 24 * 60 * 60);

    return {
      message: '로그인 성공',
      profile: user.profile_id,
      user_id: user.user_id,
      user_name: user.user_name,
      accessToken,
      refreshToken,
    };
  }

  async reissueAccessToken(
    refreshToken: string,
    payloadFromGuard: { profile_id: string; user_name?: string },
  ) {
    try {
      // Redis에서 사용자별 저장된 refresh 토큰 가져와 비교
      const stored = await this.redis.get('rt:${user.profile_id}');

      if (!stored || stored !== refreshToken) {
        throw new UnauthorizedException('유효하지 않은 refresh token');
      }
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
