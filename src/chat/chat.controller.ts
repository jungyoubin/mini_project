import { Controller, Post, Body, UseGuards, Req, Get, Delete, Param } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { JwtPayloadDto } from 'src/user/auth/jwt-dto';

// 🔥 여기에 타입 확장 정의 추가 (가장 핵심)
interface AuthRequest extends Request {
  user: JwtPayloadDto;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('room')
  @UseGuards(AuthGuard('jwt'))
  async createRoom(@Body() dto: CreateRoomDto, @Req() req: AuthRequest) {
    const user = req.user;
    console.log('user:', user);
    const room = await this.chatService.createRoom(dto, user);
    return room;
  }

  @Get('rooms')
  getRooms() {
    return this.chatService.getAllRooms();
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
