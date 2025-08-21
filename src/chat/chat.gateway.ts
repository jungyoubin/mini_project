import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Socket, Namespace } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { RoomsService } from './rooms/rooms.service';
import { wsHandshakeAuth } from './guards/ws-handshake-auth';

/*
socketId를 Redis에 저장하지 않고 user:{profileId}에 Join 하기
사용자가 속한 방은 재 Join 진행하기(새로고침으로 socketId 바뀌어도 복구하기)
메시지는 room:{chatId}로 진행
*/
@WebSocketGateway({
  namespace: 'chat', // /chat 로 접속 -> postman에서 localhost:3000/chat
  cors: { origin: true },
  path: '/socket.io',
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Namespace;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly roomsService: RoomsService,
  ) {}

  afterInit(server: Namespace) {
    server.use(wsHandshakeAuth(this.jwt, this.config));
    this.roomsService.setNamespace(this.server);
  }

  async handleConnection(client: Socket) {
    const profileId: string | undefined = client.data?.user?.sub;

    if (!profileId) {
      client.disconnect(true);
      return;
    }

    // 개인 채널
    const userLabel = `user:${profileId}`;
    client.join(userLabel);

    // 자동 재조인하기
    try {
      const roomIds = await this.roomsService.findRoomIdsByMember(profileId);
      roomIds.forEach((chatId) => client.join(`room:${chatId}`));
    } catch (e) {
      this.logger.warn(`auto rejoin failed: ${e?.message}`);
    }

    this.logger.log(`connected: profile=${profileId}, socket=${client.id}`);

    // 클라이언트 디버깅용
    client.emit('socket/registered', { socketId: client.id });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`disconnected: socket=${client.id}`);
  }

  // 테스트용 에코 이벤트(debuging)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    client.emit('pong', { at: Date.now(), echo: data });
  }

  // socket room join
  async joinProfileToRoom(profileId: string, chatId: string) {
    const userLabel = `user:${profileId}`;
    const roomLabel = `room:${chatId}`;

    // 개인 라벨에 묶인 모든 현재 소켓을 해당 방에 합류
    await this.server.to(userLabel).socketsJoin(roomLabel);

    // 합류된 소켓들에게 알림 (옵션)
    this.server.to(userLabel).emit('room/joined', { room_id: chatId });

    return { joined: true as const };
  }

  // socket room 에 대한 멤버 조회 -> socketId, profile_id 반환
  async getRoomMembers(roomId: string) {
    const roomLabel = `room:${roomId}`;
    const sockets = await this.server.in(roomLabel).fetchSockets();

    const members = sockets.map((s) => ({
      socket_id: s.id,
      profile_id: s.data?.user?.sub as string | undefined,
    }));

    return { room_id: roomId, count: members.length, members };
  }

  /*
   내 프로필이 해당 방에 "현재" 들어가 있는지 여부
   개인 라벨에 묶인 소켓들 중 하나라도 room:{roomId}에 속해 있으면 true
   */
  async isProfileInRoom(profileId: string, roomId: string) {
    const userLabel = `user:${profileId}`;
    const targetLabel = roomId.includes(':') ? roomId : `room:${roomId}`; // : 포함 여부 확인해서 사용하기

    // 내 현재 소켓들 전부 가져와서 rooms Set 확인
    const mySockets = await this.server.in(userLabel).fetchSockets();
    const inRoom = mySockets.some((s) => s.rooms.has(targetLabel));

    return { room_id: roomId, in_room: inRoom };
  }
}
