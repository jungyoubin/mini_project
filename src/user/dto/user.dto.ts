import { IsString, IsEmail, Length, Matches, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(4, 20)
  userId: string;

  @IsString()
  @Length(8, 100)
  // 예: 최소 8자, 영문/숫자/특수문자 조합
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]+$/, {
    message: '비밀번호는 최소 8자 이상이며, 영문과 숫자를 포함해야 합니다.',
  })
  userPw: string;

  @IsString()
  @Length(2, 20)
  userName: string;

  @IsEmail()
  userEmail: string;

  @IsString()
  // 하이픈 유/무 모두 허용: 010-1234-5678 또는 01012345678
  @Matches(/^(01[016789])-?\d{3,4}-?\d{4}$/, {
    message: '전화번호 형식이 올바르지 않습니다. 예) 010-1234-5678 또는 01012345678',
  })
  userPhone: string;
}
/* userName, userEmail, userPhone만 수정 가능
추후에 userPw 도 수정이 가능하도록 기능 업데이트하기
각각  부분적으로 수정이 가능하게 진행 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 20)
  userName?: string;

  @IsOptional()
  @IsEmail()
  userEmail?: string;

  @IsOptional()
  @IsString()
  @Matches(/^01[016789]-\d{3,4}-\d{4}$/, {
    message: '전화번호 형식은 010-1234-5678과 같아야 합니다.',
  })
  userPhone?: string;
}

export class LoginUserDto {
  @IsString()
  userId: string;

  @IsString()
  userPw: string;
}
