// src/chat/chat.gateway.ts
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
import { wsHandshakeAuth } from './guards/ws-handshake-auth';

@WebSocketGateway({
  namespace: 'chat', // /chat 로 접속 -> postman에서
  cors: { origin: true },
  path: '/socket.io',
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Namespace;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Namespace) {
    server.use(wsHandshakeAuth(this.jwt, this.config));
  }

  async handleConnection(client: Socket) {
    const profileId: string | undefined = client.data?.user?.sub;

    if (!profileId) {
      client.disconnect(true);
      return;
    }

    const old = await this.chatService.bindSocket(profileId, client.id); // 최신 소켓으로 바인딩 (이전 key는 제거)

    // 예전 소켓 있으면 끊기
    if (old && old !== client.id) {
      const oldSock = this.server.sockets.get(old); // Namespace.sockets: Map<string, Socket>

      if (oldSock) {
        oldSock.disconnect(true); // 단일 프로세스
      } else {
        // 분산/어댑터 환경
        const socks = await this.server.in(old).fetchSockets();
        if (socks.length > 0) {
          socks[0].disconnect(true);
        }
      }
    }

    this.logger.log(`connected: profile=${profileId}, socket=${client.id}`);
    client.emit('socket/registered', { socketId: client.id }); // 발급하면 알림(테스트)
  }

  async handleDisconnect(client: Socket) {
    await this.chatService.unbindBySocket(client.id);
    this.logger.log(`disconnected: socket=${client.id}`);
  }

  // 테스트용 에코 이벤트
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    client.emit('pong', { at: Date.now(), echo: data });
  }

  async emitToProfile(profileId: string, event: string, payload: any) {
    const sid = await this.chatService.getSocketIdByProfile(profileId);
    if (sid) this.server.to(sid).emit(event, payload);
  }
}
