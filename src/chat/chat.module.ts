import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatRoom, ChatRoomSchema } from './schemas/chat-room.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/message.schema';
import { ChatParticipant, ChatParticipantSchema } from './schemas/chat-participant.schema';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [
    // 채팅방 DB(chat_room_db)로 방 + 참여자 연결
    MongooseModule.forFeature([
      { name: ChatRoom.name, schema: ChatRoomSchema },
      { name: ChatParticipant.name, schema: ChatParticipantSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),

    // 메시지용 DB(chat_message_db) 연결
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      connectionName: 'messageConnection',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongo.uri'),
        dbName: config.get<string>('mongo.messageDbName'),
      }),
    }),
    MongooseModule.forFeature(
      [{ name: ChatMessage.name, schema: ChatMessageSchema }],
      'messageConnection',
    ),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, WsJwtGuard],
  exports: [ChatService],
})
export class ChatModule {}
