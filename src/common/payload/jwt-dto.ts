export class JwtPayloadDto {
  sub: string; // sub = profile_id
  iat?: number; // 발급 시간
  exp?: number; // 만료 시간
}
