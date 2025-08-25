import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Param,
  Get,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { HttpJwtGuard } from '../guards/jwt.guard';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly rooms: ChatService,
    private readonly gateway: ChatGateway, // socket
    // private readonly roomsService: ChatService,
  ) {}

  @UseGuards(HttpJwtGuard)
  @Post('room')
  async create(@Req() req: any, @Body() dto: CreateRoomDto) {
    const profileId: string | undefined = req.user?.sub;
    if (!profileId) throw new BadRequestException('사용자 payload 문제 이슈');
    return this.rooms.createRoomByProfile(profileId, dto.room_title);
  }

  // socket Id 저장/조회 없이 해당 방으로 들어가기
  // user:{profileId} 타깃으로 join
  @UseGuards(HttpJwtGuard)
  @Post('room/join')
  async join(@Req() req: any, @Body() dto: JoinRoomDto) {
    const profileId: string | undefined = req.user?.sub;
    if (!profileId) throw new BadRequestException('Invalid user payload');

    // 방 있는지 확인하기
    const room = await this.rooms.findRoomById(dto.room_id);
    if (!room) throw new NotFoundException('room not found');

    // Participants 업데이트(있으면 패스)
    const already = await this.rooms.isParticipant(dto.room_id, profileId);
    if (!already) {
      await this.rooms.addParticipant(dto.room_id, profileId);
    }

    //소켓 join
    await this.gateway.joinProfileToRoom(profileId, dto.room_id);

    return {
      room_id: dto.room_id,
      already_participant: already, // true면 기존 멤버였음, false는 신규 입장
      joined: true, // 들어가졌는지 확인
    };
  }

  // Socket Room 멤버 목록 조회 (확인용)
  @UseGuards(HttpJwtGuard)
  @Get('room/:roomId/members')
  async members(@Param('roomId') roomId: string) {
    const decoded = decodeURIComponent(roomId); // URI 디코딩
    return this.gateway.getRoomMembers(decoded);
  }

  /*
  내 소켓이 내 방에 들어가 있는지 확인(확인용)
  GET /chat/room/user:{roomId}/me
  Authorization: Bearer {AccessToken}
  */
  @UseGuards(HttpJwtGuard)
  @Get('room/:roomId/me')
  async amIIn(@Req() req: any, @Param('roomId') roomId: string) {
    const profileId: string | undefined = req.user?.sub;
    if (!profileId) throw new BadRequestException('Invalid user payload');

    const decoded = decodeURIComponent(roomId);
    return this.gateway.isProfileInRoom(profileId, decoded);
  }

  // 전체 방 가져오기
  @UseGuards(HttpJwtGuard)
  @Get('rooms')
  async listAll(@Req() req: any) {
    const profileId: string | undefined = req.user?.sub;
    if (!profileId) throw new BadRequestException('Invalid user payload');

    return this.rooms.listRooms(profileId);
  }

  // 내가 속한 방만
  @UseGuards(HttpJwtGuard)
  @Get('my-rooms')
  async listMine(@Req() req: any) {
    const profileId: string | undefined = req.user?.sub;
    if (!profileId) throw new BadRequestException('Invalid user payload');

    return this.rooms.listMyRooms(profileId);
  }
}
