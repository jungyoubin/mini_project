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
    const user = (client as any).user as { profile_id: string; user_name: string; sub?: string };
    const profileId = user.profile_id ?? user.sub;
    const userName = user.user_name ?? 'Unknwon';

    if (!roomId || typeof roomId !== 'string') {
      client.emit('error', '유효하지 않은 roomId 입니다.');
      return;
    }

    try {
      // DB 참여 기록 (이미 있으면 메시지만 반환)
      await this.chatService.joinRoom(roomId, profileId!, userName);

      // 소켓 룸 참여
      client.join(roomId);
      if (!this.roomParticipants.has(roomId)) this.roomParticipants.set(roomId, new Set());
      this.roomParticipants.get(roomId)!.add(client.id);

      // 히스토리 전체 전송 (오래된 -> 최신)
      const all = await this.chatService.getRoomMessages(roomId, undefined);
      client.emit('history', all.reverse());

      // this.server.to(roomId).emit('system', `${userName} 님이 입장했습니다.`);
    } catch (e: any) {
      client.emit('error', e?.message ?? '방 입장에 실패했습니다.');
    }
  }

  // 방 나가기 -> 마지막이면 방+메시지 삭제 + 소켓룸 나가기
  @SubscribeMessage('leaveRoom')
  async leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
  const user = (client as any).user as { profile_id?: string; sub?: string };
  const profileId = user.profile_id ?? user.sub;

  if (!roomId || typeof roomId !== 'string') {
    client.emit('error', '유효하지 않은 roomId 입니다.');
    return;
  }

  try {
    // 소켓 룸 탈퇴(실시간 관리)
    client.leave(roomId);
    const set = this.roomParticipants.get(roomId);
    if (set) {
      set.delete(client.id);
      if (set.size === 0) this.roomParticipants.delete(roomId);
    }

    // DB 퇴장 처리 (마지막이면 방/메시지 삭제 -- cascade)
    const result = await this.chatService.leaveRoom(roomId, profileId!);

  } catch (e: any) {
    client.emit('error', e?.message ?? '방 나가기에 실패했습니다.');
  }

  // 메시지 전송: DB 저장 + 브로드캐스트 방식
  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room_id: string; chat_message: string },
  ) {
    const user = (client as any).user as { profile_id: string; user_name: string; sub?: string };
    const profileId = user.profile_id ?? user.sub;
    const userName = user.user_name ?? 'Unknown';

    // 기본 검증
    if (!payload?.room_id) return client.emit('error', 'room_id가 필요합니다.');
    if (typeof payload.chat_message !== 'string' || payload.chat_message.trim() === '')
      return client.emit('error', '메시지가 비어있습니다.');
    if (payload.chat_message.length > 200)
      return client.emit('error', '메시지는 최대 200자까지 보낼 수 있습니다.');

    // 현재 소켓이 해당 룸에 참여 중인지 검사
    const inRoom = this.roomParticipants.get(payload.room_id)?.has(client.id);
    if (!inRoom) {
      client.emit('error', '해당 방에 먼저 join 후 메시지를 보낼 수 있습니다.');
      return;
    }

    try {
      const saved = await this.chatService.saveMessage({
        message_id: uuidv7(),
        profile_id: profileId!,
        user_name: userName,
        room_id: payload.room_id,
        chat_message: payload.chat_message,
      });

      this.server.to(payload.room_id).emit('newMessage', {
        message_id: saved.message_id,
        room_id: saved.room_id,
        profile_id: saved.profile_id,
        user_name: saved.user_name,
        chat_message: saved.chat_message,
        chat_date: saved.chat_date,
      });
    } catch (e: any) {
      client.emit('error', e?.message ?? '메시지 전송에 실패했습니다.');
    }
  }

  @SubscribeMessage('fetchAllMessages') // socket 에서 테스트할때 사용(메시지 모두 가져오는 것)
  async fetchAllMessages(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    const all = await this.chatService.getRoomMessages(roomId, undefined);
    client.emit('history', all.reverse());
  }
}
