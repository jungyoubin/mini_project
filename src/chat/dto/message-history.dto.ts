import { IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageHistoryDto {
  @IsOptional()
  @IsString() // ISO 문자열
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(200)
  limit?: number; // 기본 50
}
