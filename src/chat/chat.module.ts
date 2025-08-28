import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatRoom, ChatRoomSchema } from './schemas/chat-room.schema';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: ChatRoom.name, schema: ChatRoomSchema },
      // { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, JwtAuthGuard], // 해당 모듈에서 사용할 서비스
  exports: [ChatGateway, ChatService], // 현재 모듈의 Provider 중 다른 모듈에서 사용할 수 있도록 외부로 export 할 Provider 배열로 정의
})
export class ChatModule {}
