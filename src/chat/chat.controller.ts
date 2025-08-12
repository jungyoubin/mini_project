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
  async createRoom(@Body() dto: CreateRoomDto, @Req() req: AuthRequest) {
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

  @UseGuards(AuthGuard('jwt'))
  @Post('join/:roomId')
  async joinRoom(@Req() req: AuthRequest, @Param('roomId') roomId: string) {
    console.log('[joinRoom] req.user:', req.user);
    return this.chatService.joinRoom(roomId, req.user.profile_id);
  }

  @Delete('room/leave/:roomId')
  @UseGuards(AuthGuard('jwt'))
  async leaveRoom(@Param('roomId') roomId: string, @Req() req: AuthRequest) {
    return this.chatService.leaveRoom(roomId, req.user.profile_id);
  }
}
