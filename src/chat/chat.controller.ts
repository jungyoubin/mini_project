import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  Param,
  Get,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly rooms: ChatService,
    private readonly gateway: ChatGateway, // socket
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('room')
  async create(@Req() req: any, @Body() dto: CreateRoomDto) {
    const profileId: string | undefined = req.user?.sub;
    if (!profileId) throw new BadRequestException('사용자 payload 문제 이슈');

    // 방 생성
    const room = await this.rooms.createRoomByProfile(profileId, dto.roomTitle);

    // DB의 참가자 추가
    await this.rooms.addParticipant(room.room_id, profileId);

    // 생성자의 socket을 해당 room에 join하기
    await this.gateway.joinProfileToRoom(profileId, room.room_id);

    // 응답 확인을 위해 participants에 넣기
    const participants = Object.keys(room.participants_map ?? {}).map((pid) => ({
      profile_id: pid,
    }));

    return {
      room_id: room.room_id,
      room_title: room.room_title,
      creator_profile_id: profileId,
      participants,
    };
  }

  // Socket Room 멤버 목록 조회(잘 들어갔는지 확인용)
  @UseGuards(JwtAuthGuard)
  @Get('room/:roomId/members')
  async members(@Param('roomId') roomId: string) {
    const decoded = decodeURIComponent(roomId); // URI 디코딩
    return this.gateway.getRoomMembers(decoded);
  }
}
