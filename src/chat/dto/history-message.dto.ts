import { IsInt, IsOptional, Max, Min, IsUUID } from 'class-validator';
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
  limit: number = 10;

  @IsOptional()
  @IsUUID('7')
  cursor?: string;
}
