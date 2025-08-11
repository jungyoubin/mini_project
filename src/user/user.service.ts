import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async createUser(dto: CreateUserDto) {
    const sanitizedPhone = dto.user_phone.replace(/-/g, ''); // 불필요 양식 제거 - 하이픈 같은거
    const newUser = this.repo.create({
      user_id: dto.user_id,
      user_pw: dto.user_pw,
      user_name: dto.user_name,
      user_email: dto.user_email,
      user_phone: sanitizedPhone,
    });
    return await this.repo.save(newUser);
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

  // 삭제
  async deleteUser(profile_id: string) {
    await this.repo.delete({ profile_id });
    return { message: '삭제 완료' };
  }
}
