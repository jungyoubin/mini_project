import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import type { Request } from 'express';

// 로그인 / 토큰 재발급 api
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService, // AuthService를 주입받음
  ) {}


  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    const user = req.user as { profile_id: string };
    return await this.authService.logout(user.profile_id);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('reissue') // access token 재발급
  async reissue(@Req() req: Request) {
    // JwtRefreshStrategy.validate() 에서 준거
    const { refreshToken, profile_id, user_name } = req.user as {
      refreshToken: string;
      profile_id: string;
      user_name?: string;
    };
    return await this.authService.reissueAccessToken(refreshToken, { profile_id, user_name });
  }
}
