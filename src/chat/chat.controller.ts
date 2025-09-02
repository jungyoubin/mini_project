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
    const decoded = decodeURIComponent(roomId); // URI 디코딩
    return this.gateway.getRoomMembers(decoded);
  }
}
