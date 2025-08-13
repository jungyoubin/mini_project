import { Controller, Post, Body, UseGuards, Req, Get, Delete, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { JwtPayloadDto } from 'src/user/auth/jwt-dto';

// 타입 확장 정의 추가
interface AuthRequest extends Request {
  user: JwtPayloadDto;
}

// 방 상세
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

  // message 보내기
  @UseGuards(AuthGuard('jwt'))
  @Post('message/:roomId')
  sendMessageByHttp(
    @Req() req: AuthRequest,
    @Param('roomId') roomId: string,
    @Body('chat_message') chat_message: string,
  ) {
    return this.chatService.saveMessage({
      message_id: (Math.random() + 1).toString(36).slice(2),
      profile_id: req.user.profile_id,
      user_name: req.user.user_name,
      room_id: roomId,
      chat_message,
    });
  }

  // 메시지 가져오기
  @Get('room/:roomId/messages')
  getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit = '50',
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

  @Delete('room/leave/:roomId')
  @UseGuards(AuthGuard('jwt'))
  async leaveRoom(@Param('roomId') roomId: string, @Req() req: AuthRequest) {
    return this.chatService.leaveRoom(roomId, req.user.profile_id);
  }
}
