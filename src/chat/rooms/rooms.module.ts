import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { ChatModule } from '../chat.module';
import { JwtModule } from '@nestjs/jwt';
import { HttpJwtGuard } from 'src/guards/jwt.guard';

@Module({
  imports: [
    ConfigModule, // RoomsService가 ConfigService 사용
    JwtModule.register({}),
    forwardRef(() => ChatModule),
  ],
  providers: [RoomsService, HttpJwtGuard],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
