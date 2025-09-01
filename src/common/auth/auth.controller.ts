import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ReqUser } from '../decorators/user.decorator';
import { AuthService } from './auth.service';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';

type RefreshUser = {
  refreshToken: string;
  profileId: string;
};

// 로그인 / 토큰 재발급 api
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService, // AuthService를 주입받음
  ) {}

  @UseGuards(JwtRefreshGuard)
  @Post('reissue')
  async reissue(@ReqUser() user: RefreshUser) {
    // JwtRefreshStrategy.validate() 에서 준거
    const { refreshToken, profileId } = user;
    return this.authService.reissueAccessToken(refreshToken, { profileId });
  }
}
