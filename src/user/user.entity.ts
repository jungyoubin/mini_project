import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { HttpException, HttpStatus } from '@nestjs/common';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  profile_id: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  user_id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  user_pw: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  user_name: string;

  @Column({ type: 'varchar', length: 40, nullable: false })
  user_email: string;

  @Column({ type: 'varchar', length: 13, nullable: false })
  user_phone: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    try {
      if (this.user_pw) {
        // 이미 bcrypt 형태면 재해시하지 않기로 하기 -> user_pw를 만나면 계속 해시 하기때문에
        if (
          !this.user_pw.startsWith('$2a$') &&
          !this.user_pw.startsWith('$2b$') &&
          !this.user_pw.startsWith('$2y$')
        ) {
          this.user_pw = await bcrypt.hash(this.user_pw, 10);
        }
      }
    } catch (err) {
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR, { cause: err });
    }
  }

  async checkPassword(password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, this.user_pw);
    } catch (err) {
      return false;
    }
  }
}
