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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { JoinRoomDto } from '../dto/join-room.dto';
import { HttpJwtGuard } from '../../guards/jwt.guard';
import { ChatGateway } from '../chat.gateway';

@Controller('chat')
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly gateway: ChatGateway,
  ) {}

  @UseGuards(HttpJwtGuard)
  @Post('room')
  async create(@Req() req: any, @Body() dto: CreateRoomDto) {
    const profileId: string | undefined = req.user?.sub;
    if (!profileId) throw new BadRequestException('사용자 payload 문제 이슈');
    return this.rooms.createRoomByProfile(profileId, dto.room_title);
  }

  // socket 으로 API -> Socket join
  @UseGuards(HttpJwtGuard)
  @Post('room/join')
  async join(@Req() req: any, @Body() dto: JoinRoomDto) {
    const profileId: string | undefined = req.user?.sub;
    if (!profileId) throw new BadRequestException('Invalid user payload');

    // room 존재 확인
    const room = await this.rooms.findRoomById(dto.room_id);
    if (!room) throw new NotFoundException('room not found');

    const result = await this.gateway.joinProfileToRoom(profileId, dto.room_id);

    // 200 + 상태 반환
    return {
      room_id: dto.room_id,
      joined: result.joined,
      reason: result.joined ? undefined : result.reason,
    };
  }

  // Socket Room 멤버 목록 조회 (확인용)
  @UseGuards(HttpJwtGuard)
  @Get('room/:roomId/members')
  async members(@Param('roomId') roomId: string) {
    return this.gateway.getRoomMembers(roomId);
  }

  // 내 소켓이 그 방에 들어가 있는지 확인
  @UseGuards(HttpJwtGuard)
  @Get('room/:roomId/me')
  async amIIn(@Req() req: any, @Param('roomId') roomId: string) {
    const profileId: string | undefined = req.user?.sub;
    return this.gateway.isProfileInRoom(profileId!, roomId);
  }
}
