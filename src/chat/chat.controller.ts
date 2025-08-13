import { Controller, Post, Body, UseGuards, Req, Get, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { JwtPayloadDto } from 'src/user/auth/jwt-dto';

// 타입 확장 정의 추가
interface AuthRequest extends Request {
  user: JwtPayloadDto;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('room')
  @UseGuards(AuthGuard('jwt'))
  createRoom(@Body() dto: CreateRoomDto, @Req() req: AuthRequest) {
    return this.chatService.createRoom(dto, req.user);
  }

  @Get('rooms')
  getRooms() {
    return this.chatService.getAllRooms();
  }

  @Get('room/:roomId')
  getRoom(@Param('roomId') roomId: string) {
    return this.chatService.getRoom(roomId);
  }

  // 메시지 가져오기
  @Get('room/:roomId/messages')
  getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit = 'null',
    @Query('before') before?: string,
  ) {
    return this.chatService.getRoomMessages(
      roomId,
      Number(limit),
      before ? new Date(before) : undefined,
    );
  }

  @Get('room/:roomId/participants')
  getRoomParticipants(@Param('roomId') roomId: string) {
    return this.chatService.getRoomParticipants(roomId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('join/:roomId')
  joinRoom(@Req() req: AuthRequest, @Param('roomId') roomId: string) {
    return this.chatService.joinRoom(roomId, req.user.profile_id, req.user.user_name);
  }
}
