import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UserService } from '../user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.userService.findByUserId(username);
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.user_pw);
    return isMatch ? user : null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.redis.set(`refresh:${user.id}`, refreshToken, 'EX', 60 * 60 * 24 * 7);

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(userId: number, refreshToken: string) {
    const savedRefreshToken = await this.redis.get(`refresh:${userId}`);
    if (!savedRefreshToken || savedRefreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = { sub: userId, username: '' };
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }
}
