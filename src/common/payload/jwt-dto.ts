export class JwtPayloadDto {
  sub: string; // sub = profileId
  iat?: number; // 발급 시간
  exp?: number; // 만료 시간
}
