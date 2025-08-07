import { Entity, PrimaryColumn, Column } from 'typeorm'; // TypeORM 사용

@Entity('user') // MySQL 테이블 이름
export class User {
  @PrimaryColumn({ type: 'char', length: 36, comment: 'UUID' })
  profile_id: string;

  @Column({ type: 'varchar', length: 20, nullable: false, comment: '아이디' })
  user_id: string;

  @Column({ type: 'varchar', length: 255, nullable: false, comment: '비밀번호' })
  user_pw: string;

  @Column({ type: 'varchar', length: 20, nullable: false, comment: '사용자 이름' })
  user_name: string;

  @Column({ type: 'varchar', length: 40, nullable: false, comment: '사용자 이메일' })
  user_email: string;

  @Column({ type: 'varchar', length: 13, nullable: false, comment: '사용자 휴대폰' })
  user_phone: string;
}
