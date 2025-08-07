import { Controller, Post, Body, Get, Param, Patch, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 회원 등록
  @Post('register')
  async register(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  // 전체 유저 조회
  @Get('all')
  async findAll() {
    return this.userService.findAll();
  }

  // 특정 유저 조회
  @Get(':profile_id')
  async findOne(@Param('profile_id') profile_id: string) {
    return this.userService.findByProfileId(profile_id);
  }

  // 유저 정보 수정 (이메일, 이름, 아이디, 전화번호 등 일부 수정 가능)
  @Patch(':profile_id')
  async update(@Param('profile_id') profile_id: string, @Body() body: UpdateUserDto) {
    return this.userService.updateUser(profile_id, body);
  }

  // 유저 삭제
  @Delete(':profile_id')
  async delete(@Param('profile_id') profile_id: string) {
    return this.userService.deleteUser(profile_id);
  }
}
