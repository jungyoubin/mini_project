import {
  Body,
  Controller,
  Post,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Param,
  Get,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { ChatGateway } from './chat.gateway';
import { ReqUser } from '../common/decorators/user.decorator';
import { JwtPayloadDto } from 'src/common/payload/jwt-dto';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly rooms: ChatService,
    private readonly gateway: ChatGateway, // socket
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('room')
  async create(@ReqUser() user: JwtPayloadDto, @Body() dto: CreateRoomDto) {
    const profileId: string | undefined = user.sub;
    if (!profileId) throw new BadRequestException('사용자 payload 문제 이슈');

    // 방 생성
    const room = await this.rooms.createRoom(profileId, dto.roomTitle);

    // DB의 참가자 추가
    await this.rooms.addParticipant(room.roomId, profileId);

    // 생성자의 socket을 해당 room에 join하기
    await this.gateway.joinProfileToRoom(profileId, room.roomId);

    // 응답 확인을 위해 participants에 넣기
    const participants = Object.keys(room.participantsMap ?? {}).map((profileId) => ({
      profileId,
    }));

    return {
      roomId: room.roomId,
      roomTitle: room.roomTitle,
      roomDate: room.roomDate,
      participants,
    };
  }

  // Socket Room 멤버 목록 조회(잘 들어갔는지 확인용)
  @UseGuards(JwtAuthGuard)
  @Get('room/:roomId/members')
  async members(@Param('roomId') roomId: string) {
    return this.gateway.getRoomMembers(roomId);
  }

  // 방 들어가기
  @UseGuards(JwtAuthGuard)
  @Post('room/:roomId/join')
  async join(@ReqUser() user: JwtPayloadDto, @Param('roomId') roomId: string) {
    const profileId: string | undefined = user.sub;
    if (!profileId) throw new BadRequestException('Invalid user payload');

    // 방 있는지 확인하기
    const room = await this.rooms.findRoomById(roomId);
    if (!room) throw new NotFoundException('room not found');

    // Participants 업데이트(있으면 패스)
    const already = await this.rooms.isParticipant(roomId, profileId);
    if (!already) {
      await this.rooms.addParticipant(roomId, profileId);
    }

    //소켓 join
    await this.gateway.joinProfileToRoom(profileId, roomId);

    return {
      roomId,
      alreadyParticipant: already, // true면 기존 멤버였음, false는 신규 입장
      joined: true, // 들어가졌는지 확인
    };
  }

  // 전체 채팅방 가져오기
  @UseGuards(JwtAuthGuard)
  @Get('rooms')
  async getRooms(@ReqUser() user: JwtPayloadDto) {
    const profileId = user.sub;
    if (!profileId) throw new BadRequestException('Invalid user payload');
    return this.rooms.listAllRooms(profileId);
  }

  // 내가 들어간 채팅방만 가져오기
  @UseGuards(JwtAuthGuard)
  @Get('/myrooms')
  async getMyRooms(@ReqUser() user: JwtPayloadDto) {
    const profileId = user.sub;
    if (!profileId) throw new BadRequestException('Invalid user payload');
    return this.rooms.listMyRooms(profileId);
  }
}
