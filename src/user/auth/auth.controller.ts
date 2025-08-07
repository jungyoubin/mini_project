// 로그인 / 토큰 재발급 api

import { Body, Controller, Get, Post, UseGuards, Req, Res } from '@nestjs/common';
import { CreateUserDto } from 'src/user/user.dto';
import { AuthService } from './auth.service';
// import { LocalAuthGuard } from './guard/local-auth.guard';
// import type { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
// import { randomBytes } from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService, // AuthService를 주입받음
    private jwtService: JwtService,
  ) {}

  @Post('register') // register 주소로 Post로 온 요청 처리
  // class-validator가 자동으로 유효성 검증
  async register(@Body() userDto: CreateUserDto) {
    return await this.authService.register(userDto);
    // authService를 사용해 user 정보 저장
  }

  // @UseGuards(LocalAuthGuard)
  // @Post('login')
  // async login(@Req() req, @Res({ passthrough: true }) res: Response) {
  //   const { accessToken, refreshToken } = await this.authService.login(req.user);

  //   res.cookie('access_token', accessToken, {
  //     httpOnly: true,
  //     secure: true,
  //     sameSite: 'strict',
  //     maxAge: 15 * 60 * 1000,
  //   });

  //   res.cookie('refresh_token', refreshToken, {
  //     httpOnly: true,
  //     secure: true,
  //     sameSite: 'strict',
  //     maxAge: 7 * 24 * 60 * 60 * 1000,
  //   });

  //   const csrfToken = randomBytes(32).toString('hex');
  //   res.cookie('csrf_token', csrfToken, {
  //     httpOnly: false,
  //     secure: true,
  //     sameSite: 'strict',
  //   });

  //   return { message: 'Login successful', csrfToken };
  // }

  // @Post('refresh')
  // async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
  //   const refreshToken = req.cookies['refresh_token'];
  //   if (!refreshToken) throw new Error('No refresh token');

  //   const decoded = this.jwtService.decode(refreshToken) as any;
  //   const newAccessToken = await this.authService.refreshAccessToken(decoded.sub, refreshToken);

  //   res.cookie('access_token', newAccessToken, {
  //     httpOnly: true,
  //     secure: true,
  //     sameSite: 'strict',
  //     maxAge: 15 * 60 * 1000,
  //   });

  //   return { message: 'Access token refreshed' };
  // }
}
