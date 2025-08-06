import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  // 회원가입
  @Post('register')
  async register(@Body() body: any) {
    const exists = await this.userService.findByUserId(body.user_id);
    if (exists) throw new UnauthorizedException('이미 존재하는 아이디입니다.');
    const user = await this.userService.createUser(body);
    return { message: '회원가입 성공', profile_id: user.profile_id };
  }

  // 로그인
  @Post('login')
  async login(@Body() body: any) {
    const user = await this.userService.findByUserId(body.user_id);
    if (!user) throw new UnauthorizedException('아이디 또는 비밀번호가 잘못되었습니다.');
    const isMatch = await bcrypt.compare(body.user_pw, user.user_pw);
    if (!isMatch) throw new UnauthorizedException('아이디 또는 비밀번호가 잘못되었습니다.');

    const payload = { sub: user.profile_id, username: user.user_id };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    return { message: '로그인 성공', accessToken };
  }

  // 전체 조회
  @Get()
  async findAll() {
    return this.userService.findAll();
  }

  // 단일 조회
  @Get(':profile_id')
  async findOne(@Param('profile_id') profile_id: string) {
    return this.userService.findByProfileId(profile_id);
  }

  // 수정
  @Patch(':profile_id')
  async update(@Param('profile_id') profile_id: string, @Body() body: any) {
    return this.userService.updateUser(profile_id, body);
  }

  // 삭제
  @Delete(':profile_id')
  async remove(@Param('profile_id') profile_id: string) {
    return this.userService.deleteUser(profile_id);
  }
}
