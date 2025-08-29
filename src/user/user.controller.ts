import { Controller, Post, Body, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, LoginUserDto } from './dto/user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { ReqUser } from '../common/decorators/user.decorator';
import type { JwtPayloadDto } from 'src/common/payload/jwt-dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 회원 등록
  @Post('register')
  async register(@Body() body: CreateUserDto) {
    return this.userService.register(body);
  }

  // 로그인
  @Post('login')
  async login(@Body() loginDto: LoginUserDto) {
    return this.userService.login(loginDto); // ★ 변경
  }

  // 로그아웃
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logoutRUser(@ReqUser() user: JwtPayloadDto) {
    return this.userService.logout(user.sub);
  }

  // 전체 유저 조회
  @UseGuards(JwtAuthGuard)
  @Get('all')
  async findAll() {
    return this.userService.findAll();
  }

  // 특정 유저 조회
  @UseGuards(JwtAuthGuard)
  @Get(':profileId')
  async findOne(@Param('profileId') profileId: string) {
    return this.userService.findByProfileId(profileId);
  }

  // 유저 정보 수정 (이메일, 이름, 아이디, 전화번호 등 일부 수정 가능)
  @UseGuards(JwtAuthGuard)
  @Patch(':profileId')
  async update(@Param('profileId') profileId: string, @Body() body: UpdateUserDto) {
    return this.userService.updateUser(profileId, body);
  }
}
