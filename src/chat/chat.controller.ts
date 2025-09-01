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
      room_id: roomId,
      already_participant: already, // true면 기존 멤버였음, false는 신규 입장
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
