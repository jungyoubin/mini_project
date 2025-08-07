import { Injectable, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, LoginUserDto } from 'src/user/user.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UserService } from '../user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';

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

  async login(loginDto: LoginUserDto, res: Response) {
    const user = await this.userService.findByUserId(loginDto.user_id);

    if (!user) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.user_pw, user.user_pw);
    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    const payload = { sub: user.profile_id };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // refresh token을 Redis에 저장 (key: userId, value: refreshToken)
    await this.redis.set(user.profile_id.toString(), refreshToken, 'EX', 7 * 24 * 60 * 60); // 7일

    // 쿠키로 전달
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: false, // prod 환경에서는 true + https
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,
    });

    return {
      message: '로그인 성공',
      user_id: user.user_id,
      accessToken,
      refreshToken,
    };
  }
}
