import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('room')
  @UseGuards(AuthGuard('jwt'))
  createRoom(@Body() createRoomDto: CreateRoomDto, @Req() req: Request) {
    return this.chatService.createRoom(createRoomDto, req.user);
  }

  @Get('rooms')
  getRooms() {
    return this.chatService.getAllRooms();
  }
}
