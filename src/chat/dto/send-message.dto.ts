import { IsString, MinLength, MaxLength, IsUUID, Matches } from 'class-validator';

export class SendMessageDto {
  @IsUUID('4')
  roomId: string;

  @IsString()
  @MinLength(1, { message: '메시지는 최소 1자입니다.' })
  @MaxLength(200, { message: '메시지는 최대 200자입니다.' })
  @Matches(/\S/, { message: '메시지는 공백만으로 구성될 수 없습니다.' })
  chatMessage: string;
}
