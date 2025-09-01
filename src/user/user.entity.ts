import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { HttpException, HttpStatus } from '@nestjs/common';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'profile_id' })
  profileId: string;

  @Column({ type: 'varchar', length: 20, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: false, name: 'user_pw' })
  userPw: string;

  @Column({ type: 'varchar', length: 20, nullable: false, name: 'user_name' })
  userName: string;

  @Column({ type: 'varchar', length: 40, nullable: false, name: 'user_email' })
  userEmail: string;

  @Column({ type: 'varchar', length: 13, nullable: false, name: 'user_phone' })
  userPhone: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    try {
      if (this.userPw) {
        // 이미 bcrypt 형태면 재해시하지 않기로 하기 -> user_pw를 만나면 계속 해시 하기때문에
        if (
          !this.userPw.startsWith('$2a$') &&
          !this.userPw.startsWith('$2b$') &&
          !this.userPw.startsWith('$2y$')
        ) {
          this.userPw = await bcrypt.hash(this.userPw, 10);
        }
      }
    } catch (err) {
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR, { cause: err });
    }
  }

  async checkPassword(password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, this.userPw);
    } catch (err) {
      return false;
    }
  }
}
