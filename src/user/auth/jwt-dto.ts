export class JwtPayloadDto {
  sub: string; // sub = profile_id
  user_name?: string;
  iat?: number; // 발급 시간
  exp?: number; // 만료 시간
}
