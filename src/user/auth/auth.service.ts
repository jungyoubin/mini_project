import { Injectable, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, LoginUserDto } from 'src/user/user.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UserService } from '../user.service';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { JwtPayloadDto } from './jwt-dto';
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

  async login(loginDto: LoginUserDto, res: Response) {
    const user = await this.userService.findByUserId(loginDto.user_id);
    if (!user) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }

    const isPasswordValid = await user.checkPassword(loginDto.user_pw);
    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    const payload = { sub: user.profile_id };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.redis.set(user.profile_id.toString(), refreshToken, 'EX', 7 * 24 * 60 * 60);

    return {
      message: '로그인 성공',
      profile: user.profile_id,
      user_id: user.user_id,
      user_name: user.user_name,
      accessToken,
      refreshToken,
    };
  }

  async reissueAccessToken(refreshToken: string) {
    try {
      const jwtSecret = this.configService.get<string>('jwt.secret') || 'default_secret';

      const payload = this.jwtService.verify(refreshToken, { secret: jwtSecret });

      const storedToken = await this.redis.get(payload.sub.toString());
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('유효하지 않은 refresh token');
      }

      const newAccessToken = this.jwtService.sign({ sub: JwtPayloadDto }, { expiresIn: '1h' });

      return { accessToken: newAccessToken };
    } catch (err) {
      throw new UnauthorizedException('refresh token이 만료되었거나 유효하지 않습니다.');
    }
  }
}
