// 로그인 / 토큰 재발급 api

import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, LoginUserDto } from 'src/user/user.dto';
import { AuthService } from './auth.service';
import type { Response } from 'express';
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService, // AuthService를 주입받음
  ) {}

  @Post('register') // register 주소로 Post로 온 요청 처리
  // class-validator가 자동으로 유효성 검증
  async register(@Body() userDto: CreateUserDto) {
    return await this.authService.register(userDto);
    // authService를 사용해 user 정보 저장
  }

  @Post('login') // 로그인
  async login(@Body() loginDto: LoginUserDto, @Res({ passthrough: true }) res: Response) {
    return await this.authService.login(loginDto, res);
  }

  @Post('reissue') // access token 재발급
  async reissue(@Req() req: Request) {
    const refreshToken = req.headers['authorization']?.replace('Bearer ', '');

    if (!refreshToken) {
      throw new UnauthorizedException('refresh token이 없습니다.');
    }

    return await this.authService.reissueAccessToken(refreshToken);
  }
}
