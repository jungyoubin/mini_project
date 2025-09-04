import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Namespace } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { wsHandshakeAuth } from '../common/guards/ws-handshake-auth';
import { SendMessageDto } from './dto/send-message.dto';
import { UserService } from 'src/user/user.service';

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
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Namespace; // 현재의 네임스페이스(/chat)의 socket.io
  private readonly logger = new Logger(ChatGateway.name);

  // JWT, Config, RoomService 주입 받기
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    private readonly userService: UserService,
  ) {}

  // handshake 미들웨어
  afterInit(server: Namespace) {
    this.server = server;
    server.use(wsHandshakeAuth(this.jwtService, this.configService)); // socket.io를 미들웨어로 등록하기(handshake에서 토큰 검증) -> 성공하면 client.data.user에 payload 주입
  }

  // socket 연결되면 실행
  async handleConnection(client: Socket) {
    const profileId: string | undefined = client.data?.user?.sub; // 핸드셰이크 미들웨이가 넣어준 client.data.user에서 sub(profileId)추출하기

    if (!profileId) {
      client.disconnect(true);
      return;
    }

    // 개인 채널 join 하기
    const userLabel = `user:${profileId}`;
    client.join(userLabel); // socketIdrk user:{profileId} 룸에 저장됨

    // 연결 시 이름 조회해서 socket 캐시
    const userName = await this.userService.findName(profileId); // userName ?? null

    if (userName == null) {
      client.emit('error', { code: 'USER_NAME_MISSING', message: '사용자 이름이 없습니다.' });
      client.disconnect(true);
      return;
    }
    client.data.userName = userName;

    // 자동 재조인하기 -> profileId로 DB조회 하고 room:{roomId}에 자동 조인시키기
    try {
      const roomIds = await this.chatService.findRoomIdsByMember(profileId); // DB에서 사용자가 들어간 채팅방 ID 가져오기
      roomIds.forEach((roomId) => client.join(`room:${roomId}`)); // 가져온 각각의 roomId에 대해서 join 하기

      // 접속하였던 방들에대해서 rejoin이 출력
      this.logger.log(`auto rejoined rooms for ${profileId}: ${roomIds.join(', ')}`);

      // < 테스트용 코드 > 방 자동 재접속을 하였을 때, 방들에 Socket이 잘 들어갔는지 확인하는 코드
      client.emit('rooms/rejoined', { rooms: roomIds.map((id) => `room:${id}`) });
    } catch (e) {
      this.logger.warn(`auto rejoin failed: ${e?.message}`);
    }

    // 연결되면 socketId가 출력
    this.logger.log(`connected: profile=${profileId}, socket=${client.id}`); // client.id = socketId

    // < 테스트용 코드 > 소켓 서버에 연결 하였을때, 소켓 아이디를 잘 받아왔는지 확인하는 코드
    client.emit('socket/registered', { socketId: client.id });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`disconnected: socket=${client.id}`);
  }

  // socket room join -> 유저의 소켓을 해당 채팅룸으로 join 하기
  // /chat/room/join 또는 /chat/room(방 생성) 에서 호출
  async joinProfileToRoom(profileId: string, roomId: string) {
    const userLabel = `user:${profileId}`;
    const roomLabel = `room:${roomId}`;

    // this.server.to(user:profileId) : 해당 유저의 소켓들에 대해서 타겟팅
    // socketsJoin(room:roomId) :그 소켓들을 채팅방룸에 넣기
    await this.server.to(userLabel).socketsJoin(roomLabel);

    const sockets = await this.server.in(userLabel).fetchSockets();
    if (sockets.length === 0) throw new Error('사용자의 살아있는 소켓이 없다');

    const userName: string = sockets[0].data.userName;

    // 방의 다른 사람들에게만 "누가 들어왔다" 알림
    this.server.to(roomLabel).emit('system:userJoin', {
      roomId,
      profileId,
      userName,
      joinedAt: new Date().toISOString(),
    });
  }

  // SocketRoom에서 사용자(Profile)를 떠나게 하는 메서드
  async leaveProfileFromRoom(profileId: string, roomId: string) {
    const userLabel = `user:${profileId}`;
    const roomLabel = `room:${roomId}`;
    // userRoom에 있는 소켓(=해당 사용자 소켓)을 chatRoom에서 이탈
    await this.server.in(userLabel).socketsLeave(roomLabel);
  }

  // socket room 에 대한 멤버 조회 -> socketId, profileId 반환
  async getRoomMembers(roomId: string) {
    const roomLabel = roomId.includes(':') ? roomId : `room:${roomId}`;
    const sockets = await this.server.in(roomLabel).fetchSockets();

    const members = sockets.map((s) => ({
      socketId: s.id,
      profileId: s.data?.user?.sub,
    }));

    return { roomId, count: members.length, members };
  }

  // 메시지 전송 : DB 저장 -> 방 전체(본인 포함) 브로드캐스트 진행하기
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto, // { roomId, chatMessage } (DTO 검증/변환 적용)
  ) {
    const profileId: string = client.data?.user?.sub;

    if (!profileId) return;
    const { roomId, chatMessage } = dto;
    const userLabel = `user:${profileId}`;
    const roomLabel = `room:${roomId}`;

    const sockets = await this.server.in(userLabel).fetchSockets();
    if (sockets.length === 0) throw new Error('사용자의 살아있는 소켓이 없다');

    const userName = sockets[0].data.userName;

    const saved = await this.chatService.sendMessage(roomId, profileId, chatMessage);

    this.server.to(roomLabel).emit('message:new', {
      // message:new 이벤트로 방 참가자 모두에게 전송
      roomId: saved.roomId,
      messageId: saved.messageId,
      profileId: saved.profileId,
      userName,
      messageContent: saved.messageContent,
      messageDate: saved.messageDate,
    });
  }
}
