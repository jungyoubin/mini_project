import {
  Body,
  Controller,
  Post,
  UseGuards,
  BadRequestException,
  Param,
  Get,
  Delete,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { ChatGateway } from './chat.gateway';
import { ReqUser } from '../common/decorators/user.decorator';
import { JwtPayloadDto } from 'src/common/payload/jwt-dto';
import { HistoryMessageParamsDto, HistoryMessageQueryDto } from './dto/history-message.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway, // socket
  ) {}

  // 방 생성
  @UseGuards(JwtAuthGuard)
  @Post('room')
  async create(@ReqUser() user: JwtPayloadDto, @Body() dto: CreateRoomDto) {
    return this.chatService.createAndJoinRoom(user.sub, dto.roomTitle);
  }

  // Socket Room 멤버 목록 조회(잘 들어갔는지 확인용)
  @UseGuards(JwtAuthGuard)
  @Get(':roomId/members')
  async members(@Param('roomId') roomId: string) {
    return this.chatGateway.getRoomMembers(roomId);
  }

  // 방 들어가기
  @UseGuards(JwtAuthGuard)
  @Post('/:roomId')
  async join(@ReqUser() user: JwtPayloadDto, @Param('roomId') roomId: string) {
    return this.chatService.joinRoom(user.sub, roomId);
  }

  // 전체 채팅방 가져오기
  @UseGuards(JwtAuthGuard)
  @Get('rooms')
  async getRooms(@ReqUser() user: JwtPayloadDto) {
    const profileId = user.sub;
    if (!profileId) throw new BadRequestException('Invalid user payload');
    return this.chatService.listAllRooms(profileId);
  }

  // 내가 들어간 채팅방만 가져오기
  @UseGuards(JwtAuthGuard)
  @Get('/myrooms')
  async getMyRooms(@ReqUser() user: JwtPayloadDto) {
    const profileId = user.sub;
    if (!profileId) throw new BadRequestException('Invalid user payload');
    return this.chatService.listMyRooms(profileId);
  }

  // 방 나가기
  @UseGuards(JwtAuthGuard)
  @Delete(':roomId')
  async leaveRoom(@ReqUser() user: JwtPayloadDto, @Param('roomId') roomId: string) {
    return this.chatService.leaveRoom(user.sub, roomId);
  }

  // 메시지 가져오기
  @UseGuards(JwtAuthGuard)
  @Get('room/:roomId/message')
  async listRoomMessages(
    @Param() { roomId }: HistoryMessageParamsDto,
    @Query() query: HistoryMessageQueryDto,
  ) {
    const limit = query.limit; // 1~200, 기본 50
    const cursorDate = query.cursor ? new Date(query.cursor) : undefined;

    return this.chatService.getRoomMessages(roomId, limit, cursorDate);
  }
}
