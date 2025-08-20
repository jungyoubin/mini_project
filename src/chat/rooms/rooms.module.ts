import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';

@Module({
  imports: [JwtModule.register({})],
  providers: [RoomsService],
  controllers: [RoomsController],
})
export class RoomsModule {}
