import { IsOptional, IsString, Max, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageHistoryDto {
  @IsUUID('4') // roomId는 v4 UUID가 아니라면 @IsString()으로 변경
  roomId!: string;

  @IsOptional()
  @IsString() // ISO 문자열
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(200)
  limit?: number; // 기본 50
}
