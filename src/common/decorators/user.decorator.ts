import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayloadDto } from 'src/user/auth/jwt-dto';

type AuthedRequest = Request & { user?: JwtPayloadDto };

export const ReqUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadDto | undefined => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest & { user?: JwtPayloadDto }>();
    return req.user;
  },
);
