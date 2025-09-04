import { IsInt, IsOptional, Max, Min, IsISO8601, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class HistoryMessageParamsDto {
  @IsUUID('4')
  roomId: string;
}

export class HistoryMessageQueryDto {
  // 기본값 50, 1~200 범위
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;

  // ISO8601 문자열(예: 2025-09-03T10:05:09.577Z)
  @IsOptional()
  @IsISO8601()
  cursor?: string;
}
