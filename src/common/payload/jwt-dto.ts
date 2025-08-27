export class JwtPayloadDto {
  sub: string; // sub = profile_id
  // profile_id: string
  iat?: number; // 발급 시간
  exp?: number; // 만료 시간
}
