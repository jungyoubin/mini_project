import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayloadDto } from 'src/common/payload/jwt-dto';

export const ReqUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadDto | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtPayloadDto }>();

    return req.user;
  },
);
