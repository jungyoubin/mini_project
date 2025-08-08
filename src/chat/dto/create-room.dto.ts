import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  room_title: string;
}
