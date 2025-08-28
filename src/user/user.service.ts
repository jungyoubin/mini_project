import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto, LoginUserDto } from './dto/user.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // redis에 원문 저장하지 않기 -> redis가 해킹당하면 그대로 보여주기 때문에
  // 검증 받을때, 사용자가 가지고 있는 RT를 sha256 해서 redis에 있는것과 비교진행하기
  private sha256(s: string) {
    return createHash('sha256').update(s).digest('hex');
  }
  // '7d'|'1h'|'30m' 등 문자열 TTL → seconds로 바꾸기
  private parseTTLToSeconds(ttl: string, fallbackSec: number): number {
    if (!ttl) return fallbackSec;
    const m = ttl.match(/^(\d+)([dhms])$/i);
    if (!m) return fallbackSec;
    const n = parseInt(m[1], 10);
    switch (m[2].toLowerCase()) {
      case 'd':
        return n * 86400;
      case 'h':
        return n * 3600;
      case 'm':
        return n * 60;
      case 's':
        return n;
      default:
        return fallbackSec;
    }
  }

  async register(dto: CreateUserDto) {
    const exists = await this.findByUserId(dto.user_id);
    if (exists) {
      throw new HttpException('해당 아이디는 이미 사용중입니다.', HttpStatus.BAD_REQUEST);
    }
    const sanitizedPhone = dto.user_phone.replace(/-/g, '');
    const newUser = this.repo.create({ ...dto, user_phone: sanitizedPhone });
    const saved = await this.repo.save(newUser);
    const { user_pw, ...safe } = saved;
    return safe;
  }

  // login 이동
  async login(loginDto: LoginUserDto) {
    const user = await this.findByUserId(loginDto.user_id);
    if (!user) throw new UnauthorizedException('존재하지 않는 사용자입니다.');

    const ok = await user.checkPassword(loginDto.user_pw);
    if (!ok) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

    const accessTTL = this.configService.get<string>('jwt.accessTTL', '1h');
    const refreshTTL = this.configService.get<string>('jwt.refreshTTL', '7d');

    const payload = { sub: user.profile_id, user_name: user.user_name };

    const accessToken = this.jwtService.sign(payload, { expiresIn: accessTTL });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: refreshTTL });

    const key = `rt:${user.profile_id}`;
    const refreshSec = this.parseTTLToSeconds(refreshTTL, 7 * 24 * 60 * 60);
    await this.redis.set(key, this.sha256(refreshToken), 'EX', refreshSec);

    return {
      message: '로그인 성공',
      profile: user.profile_id,
      user_id: user.user_id,
      user_name: user.user_name,
      accessToken,
      refreshToken,
    };
  }

  // 로그아웃시 삭제
  async logout(profileId: string) {
    await this.redis.del(`rt:${profileId}`);
    return { message: '로그아웃 완료' };
  }

  async findByUserId(user_id: string) {
    return this.repo.findOne({ where: { user_id } });
  }

  async findByProfileId(profile_id: string) {
    return this.repo.findOne({ where: { profile_id } });
  }

  // 전체 조회
  async findAll() {
    return this.repo.find();
  }

  // 수정(name, email, phone만 가능)
  async updateUser(profile_id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.repo.findOne({ where: { profile_id } });
    if (!user) throw new NotFoundException('해당 유저를 찾을 수 없습니다.');

    const { user_name, user_email } = dto;
    const user_phone = dto.user_phone ? dto.user_phone.replace(/-/g, '') : undefined;

    // 허용된 필드만 반영
    if (user_name !== undefined) user.user_name = user_name;
    if (user_email !== undefined) user.user_email = user_email;
    if (user_phone !== undefined) user.user_phone = user_phone;

    return this.repo.save(user);
  }
}
