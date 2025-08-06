import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

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
    const hashedPw = await bcrypt.hash(data.user_pw, 10);
    const newUser = this.repo.create({
      profile_id: uuidv4(),
      user_id: data.user_id,
      user_pw: hashedPw,
      user_name: data.user_name,
      user_email: data.user_email,
      user_phone: data.user_phone,
    });
    return this.repo.save(newUser);
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
  async updateUser(profile_id: string, data: Partial<User>) {
    if (data.user_pw) {
      data.user_pw = await bcrypt.hash(data.user_pw, 10);
    }
    await this.repo.update({ profile_id }, data);
    return this.findByProfileId(profile_id);
  }

  // 삭제
  async deleteUser(profile_id: string) {
    await this.repo.delete({ profile_id });
    return { message: '삭제 완료' };
  }
}
