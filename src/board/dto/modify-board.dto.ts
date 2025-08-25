import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ModifyBoardDto {
  @IsOptional() // Option -> 있어도 되고 말아도 되고
  @IsString()
  @MaxLength(30, { message: '제목은 최대 30자입니다.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  board_title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '본문은 최대 200자입니다.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  board_content?: string;
}
