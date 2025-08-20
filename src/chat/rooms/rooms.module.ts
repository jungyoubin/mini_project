import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { ChatModule } from '../chat.module';

@Module({
  imports: [JwtModule.register({}), ChatModule],
  providers: [RoomsService],
  controllers: [RoomsController],
})
export class RoomsModule {}
