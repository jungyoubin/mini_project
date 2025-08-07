import { Injectable } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CreateUserDto } from 'src/user/user.dto';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UserService } from '../user.service';
import * as bcrypt from 'bcrypt';

@Injectable() // provider로 사용
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // 메서드 내부에 await 구문이 있으므로 async 필요
  async register(userDto: CreateUserDto) {
    // 이미 가입된 유저가 있는지 체크(아이디로 체크)
    const user = await this.userService.findByUserId(userDto.user_id);
    if (user) {
      // 이미 가입된 유저가 있다면 에러 발생
      throw new HttpException('해당 아이디는 이미 사용중입니다.', HttpStatus.BAD_REQUEST);
    }

    // 패스워드 암호화
    // bcrypt.hashSync() 함수는 평문 비밀번호를 bcrypt 알고리즘으로 동기화 작업
    // 첫 번째 인수는 암호화할 평문 비밀번호
    // 두 번째 인수는 saltRounds 값 = 해시 강도를 결정(일반적으로 10 이상의 값)
    const encryptedPassword = bcrypt.hashSync(userDto.user_pw, 10);

    // 데이터베이스에 저장, 저장 중 에러가 나면 서버 에러 발생
    try {
      const newUser = await this.userService.createUser({
        ...userDto,
        user_pw: encryptedPassword,
      });
      // 회원가입 후 반환하는 값에는 password 주지 않음
      const { user_pw, ...safeUser } = newUser;
      return safeUser;
    } catch (error) {
      throw new HttpException('서버 에러', 500);
    }
  }

  // async validateUser(username: string, password: string) {
  //   const user = await this.userService.findByUserId(username);
  //   if (!user) return null;
  //   const isMatch = await bcrypt.compare(password, user.user_pw);
  //   return isMatch ? user : null;
  // }

  // async login(user: any) {
  //   const payload = { username: user.username, sub: user.id };

  //   const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
  //   const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

  //   await this.redis.set(`refresh:${user.id}`, refreshToken, 'EX', 60 * 60 * 24 * 7);

  //   return { accessToken, refreshToken };
  // }

  // async refreshAccessToken(userId: number, refreshToken: string) {
  //   const savedRefreshToken = await this.redis.get(`refresh:${userId}`);
  //   if (!savedRefreshToken || savedRefreshToken !== refreshToken) {
  //     throw new UnauthorizedException('Invalid refresh token');
  //   }

  //   const payload = { sub: userId, username: '' };
  //   return this.jwtService.sign(payload, { expiresIn: '15m' });
  // }
}
