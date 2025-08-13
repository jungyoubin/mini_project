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

  // 연결시(인증은 WsJwtGuard 에서)
  handleConnection(_client: Socket) {}

  // 연결 종료
  handleDisconnect(client: Socket) {
    for (const [roomId, sockets] of this.roomParticipants.entries()) {
      if (sockets.delete(client.id) && sockets.size === 0) this.roomParticipants.delete(roomId);
    }
  }

  // 입장시, DB 기록 + 소켓 룸으로 들어감 + 히스토리 전송하기
  @SubscribeMessage('joinRoom')
  async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    const user = (client as any).user as { profile_id: string; user_name: string };

    // DB 참여 기록 확인
    await this.chatService.joinRoom(roomId, user.profile_id, user.user_name);

    // 소켓 룸 참여
    client.join(roomId);
    if (!this.roomParticipants.has(roomId)) this.roomParticipants.set(roomId, new Set());
    this.roomParticipants.get(roomId)!.add(client.id);

    // 히스토리 전체 전송
    const all = await this.chatService.getRoomMessages(roomId, undefined);
    client.emit('history', all.reverse()); // reverse : 오래된 -> 최신순으로
  }

  // 방 나가기 -> 마지막이면 방+메시지 삭제 + 소켓룸 나가기
  @SubscribeMessage('leaveRoom')
  async leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    const user = (client as any).user as { profile_id: string };

    // 소켓 룸 나가기
    client.leave(roomId);
    const set = this.roomParticipants.get(roomId);
    if (set) {
      set.delete(client.id);
      if (set.size === 0) this.roomParticipants.delete(roomId);
    }
    // DB 퇴장 처리 (마지막이면 방/메시지 캐스케이드 삭제)
    const result = await this.chatService.leaveRoom(roomId, user.profile_id);
  }

  // 메시지 전송: DB 저장 + 브로드캐스트 방식
  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room_id: string; chat_message: string },
  ) {
    const user = (client as any).user as { profile_id: string; user_name: string };

    // 현재 소켓이 해당 룸에 참여 중인지 검사
    const inRoom = this.roomParticipants.get(payload.room_id)?.has(client.id);
    if (!inRoom) {
      client.emit('error', '해당 방에 먼저 join 후 메시지를 보낼 수 있습니다.');
      return;
    }

    const saved = await this.chatService.saveMessage({
      message_id: uuidv7(),
      profile_id: user.profile_id,
      user_name: user.user_name,
      room_id: payload.room_id,
      chat_message: payload.chat_message,
    });

    // 같은 방 모두에게 브로드캐스트
    this.server.to(payload.room_id).emit('newMessage', {
      message_id: saved.message_id,
      room_id: saved.room_id,
      profile_id: saved.profile_id,
      user_name: saved.user_name,
      chat_message: saved.chat_message,
      chat_date: saved.chat_date,
    });
  }

  @SubscribeMessage('fetchAllMessages') // socket 에서 테스트할때 사용(메시지 모두 가져오는 것)
  async fetchAllMessages(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    const all = await this.chatService.getRoomMessages(roomId, undefined);
    client.emit('history', all.reverse());
  }
}
