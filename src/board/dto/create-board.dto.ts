import { IsString, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @MaxLength(30, { message: '제목은 최대 30자입니다.' })
  board_title: string;

  @IsString()
  @MaxLength(200, { message: '본문은 최대 200자입니다.' })
  board_content: string;
}
