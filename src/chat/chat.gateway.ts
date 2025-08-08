import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  /**
   * roomParticipants 구조:
   * {
   *   [roomId: string]: Set<socket.id>
   * }
   */
  private roomParticipants: Map<string, Set<string>> = new Map();

  constructor(private readonly chatService: ChatService) {}

  // 클라이언트 연결 시
  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  // 클라이언트 연결 종료 시
  async handleDisconnect(client: Socket) {
    for (const [roomId, sockets] of this.roomParticipants.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        client.leave(roomId);

        if (sockets.size === 0) {
          this.roomParticipants.delete(roomId);
          await this.chatService.deleteRoomAndMessages(roomId); // 메시지 + 방 삭제
          console.log(`🗑 Room ${roomId} deleted because all users left.`);
        }
        break;
      }
    }
    console.log('Client disconnected:', client.id);
  }

  // 방 입장
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, roomId: string) {
    client.join(roomId);

    if (!this.roomParticipants.has(roomId)) {
      this.roomParticipants.set(roomId, new Set());
    }

    const participants = this.roomParticipants.get(roomId)!;
    participants.add(client.id);

    console.log(`🚪 Client ${client.id} joined room ${roomId}`);
  }

  // 메시지 전송
  @SubscribeMessage('sendMessage')
  async handleMessage(
    client: Socket,
    payload: {
      room_id: string;
      profile_id: string;
      chat_message: string;
    },
  ) {
    const message_id = uuidv4();

    // DB 저장
    await this.chatService.saveMessage({
      message_id,
      profile_id: payload.profile_id,
      room_id: payload.room_id,
      chat_message: payload.chat_message,
    });

    // 해당 방 모든 유저에게 메시지 전송
    this.server.to(payload.room_id).emit('newMessage', {
      message_id,
      ...payload,
      chat_date: new Date(),
    });

    console.log(`💬 [${payload.room_id}] ${payload.profile_id}: ${payload.chat_message}`);
  }
}
