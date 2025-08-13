import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { v7 as uuidv7 } from 'uuid';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@WebSocketGateway({ cors: { origin: '*' } })
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private roomParticipants: Map<string, Set<string>> = new Map();

  constructor(private readonly chatService: ChatService) {}

  handleConnection(_client: Socket) {}

  handleDisconnect(client: Socket) {
    for (const [roomId, sockets] of this.roomParticipants.entries()) {
      if (sockets.delete(client.id) && sockets.size === 0) this.roomParticipants.delete(roomId);
    }
  }

  // 입장하면 -> 히스토리 50개 전송(임시로)
  @SubscribeMessage('joinRoom')
  async join(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    client.join(roomId);
    if (!this.roomParticipants.has(roomId)) this.roomParticipants.set(roomId, new Set());
    this.roomParticipants.get(roomId)!.add(client.id);

    const history = await this.chatService.getRoomMessages(roomId, 50);
    client.emit('history', history.reverse()); // 오래된 -> 최신 순
  }

  // 메시지 전송: DB 저장 + 브로드캐스트
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room_id: string; chat_message: string },
  ) {
    const message_id = uuidv7();
    const user = (client as any).user as { profile_id: string; user_name: string };

    await this.chatService.saveMessage({
      message_id,
      profile_id: user.profile_id,
      user_name: user.user_name,
      room_id: payload.room_id,
      chat_message: payload.chat_message,
    });

    this.server.to(payload.room_id).emit('newMessage', {
      message_id,
      room_id: payload.room_id,
      profile_id: user.profile_id,
      user_name: user.user_name,
      chat_message: payload.chat_message,
      chat_date: new Date(),
    });
  }

  @SubscribeMessage('leaveRoom')
  leave(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    client.leave(roomId);
    const set = this.roomParticipants.get(roomId);
    if (set) {
      set.delete(client.id);
      if (set.size === 0) this.roomParticipants.delete(roomId);
    }
  }
}
