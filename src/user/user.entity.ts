import { Entity, PrimaryColumn, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { HttpException, HttpStatus } from '@nestjs/common';

@Entity('user')
export class User {
  @PrimaryColumn({ type: 'char', length: 36 })
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
        const salt = 10;
        this.user_pw = await bcrypt.hash(this.user_pw, salt);
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
