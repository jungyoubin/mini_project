import { IsString, Length } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @Length(1, 100)
  room_id!: string;
}

/*
socket join 요청
*/
