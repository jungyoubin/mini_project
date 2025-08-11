import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async createUser(data: {
    user_id: string;
    user_pw: string;
    user_name: string;
    user_email: string;
    user_phone: string;
  }) {
    const newUser = this.repo.create({
      user_id: data.user_id,
      user_pw: data.user_pw,
      user_name: data.user_name,
      user_email: data.user_email,
      user_phone: data.user_phone,
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

  // 수정
  async updateUser(profile_id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.repo.findOne({ where: { profile_id } });
    if (!user) throw new NotFoundException('해당 유저를 찾을 수 없습니다.');
    Object.assign(user, updateData);
    return this.repo.save(user);
  }

  // 삭제
  async deleteUser(profile_id: string) {
    await this.repo.delete({ profile_id });
    return { message: '삭제 완료' };
  }
}
