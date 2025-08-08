export class JwtPayloadDto {
  profile_id: string;
  user_name: string;
  sub?: string;
  access_token?: string;
}
