import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatRoom, ChatRoomSchema } from './schemas/chat-room.schema';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: ChatRoom.name, schema: ChatRoomSchema }])],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
