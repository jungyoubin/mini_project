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
import { ChatService } from './chat.service';
import { wsHandshakeAuth } from './auth/ws-handshake-auth';

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
  @WebSocketServer() server: Namespace; // 현재 네임스페이스(/chat)의 socket.io
  private readonly logger = new Logger(ChatGateway.name);

  // JWT, Config, RoomsService 주입받기
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly roomsService: ChatService,
  ) {}

  // handshake 미들웨어 -> JWT 파싱 작업해서 client.data.user에 주기
  afterInit(server: Namespace) {
    server.use(wsHandshakeAuth(this.jwt, this.config)); // socket.io를 미들웨어로 등록하기(handshake에서 토큰 검증) -> 성공하면 client.data.user에 payload 주입
    this.roomsService.setNamespace(this.server); // socket room의 현재 멤버를 조회할 수 있게 한다
  }

  // socket 연결되면 실행
  async handleConnection(client: Socket) {
    const profileId: string | undefined = client.data?.user?.sub; // 핸드셰이크 미들웨이가 넣어준 client.data.uesr에서 sub(profileId)추출하기

    if (!profileId) {
      client.disconnect(true);
      return;
    }

    // 개인 채널 join 하기
    const userLabel = `user:${profileId}`;
    client.join(userLabel);

    // 자동 재조인하기 -> profileId로 DB조회 하고 room:{roomId}에 자동 조인시키기
    try {
      const roomIds = await this.roomsService.findRoomIdsByMember(profileId); // DB에서 사용자가 들어간 채팅방 ID 가져오기
      roomIds.forEach((chatId) => client.join(`room:${chatId}`)); // 가져온 각각의 chatId에 대해서 join 하기

      // socket연결했을때 방들 다시 join 하는지 확인하는 코드(필요없으면 지우기 아래 2줄)
      this.logger.log(`auto rejoined rooms for ${profileId}: ${roomIds.join(', ')}`);
      client.emit('rooms/rejoined', { rooms: roomIds.map((id) => `room:${id}`) });
    } catch (e) {
      this.logger.warn(`auto rejoin failed: ${e?.message}`);
    }

    // 클라이언트 디버깅 확인용 -> 연결되면 socketId가 출력됨
    this.logger.log(`connected: profile=${profileId}, socket=${client.id}`); // client.id = socketId
    client.emit('socket/registered', { socketId: client.id });
  }

  ////////// 추후 필요하면 진행하기 ////////////
  async handleDisconnect(client: Socket) {
    this.logger.log(`disconnected: socket=${client.id}`);
  }

  // 테스트용 에코 이벤트(debuging)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    client.emit('pong', { at: Date.now(), echo: data });
  }

  // socket room join -> 유저의 소켓을 해당 채팅룸으로 join 하기
  // /chat/room/join 에서 호출
  async joinProfileToRoom(profileId: string, chatId: string) {
    const userLabel = `user:${profileId}`;
    const roomLabel = `room:${chatId}`;

    // this.server.to(user:profileId) : 해당 유저의 소켓들에 대해서 타겟팅
    // socketsJoin(room:chatId) :그 소켓들을 채팅방룸에 넣기
    await this.server.to(userLabel).socketsJoin(roomLabel);

    // 합류된 소켓들에게 알림 (일단 보류)
    this.server.to(userLabel).emit('room/joined', { room_id: chatId });

    return { joined: true as const };
  }

  // socket room 에 대한 멤버 조회 -> socketId, profile_id 반환
  async getRoomMembers(roomId: string) {
    const roomLabel = roomId.includes(':') ? roomId : `room:${roomId}`;
    const sockets = await this.server.in(roomLabel).fetchSockets();

    const members = sockets.map((s) => ({
      socket_id: s.id,
      profile_id: s.data?.user?.sub as string | undefined,
    }));

    return { room_id: roomId, count: members.length, members };
  }

  /*
   내 프로필이 해당 방에 "현재" 들어가 있는지 여부
   개인 라벨에 묶인 소켓들 중 room:{roomId}에 속해 있으면 true
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
