import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty() // 빈 문자열 차단
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) // 공백 제거
  chatMessage: string;
}
