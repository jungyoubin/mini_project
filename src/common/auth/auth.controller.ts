import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ReqUser } from '../decorators/user.decorator';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { JwtPayloadDto } from '../payload/jwt-dto';

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

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@ReqUser() user: JwtPayloadDto) {
    const profileId = user.sub;
    return await this.authService.logout(profileId);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('reissue')
  async reissue(@Req() req: Request & { user: RefreshUser }) {
    // JwtRefreshStrategy.validate() 에서 준거
    const { refreshToken, profileId } = req.user;
    return this.authService.reissueAccessToken(refreshToken, { profileId });
  }
}
