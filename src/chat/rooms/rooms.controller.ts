import { Body, Controller, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { HttpJwtGuard } from '../../guards/jwt.guard';

@Controller('chat')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @UseGuards(HttpJwtGuard)
  @Post('room')
  async create(@Req() req: any, @Body() dto: CreateRoomDto) {
    const profileId: string | undefined = req.user?.sub;
    if (!profileId) throw new BadRequestException('Invalid user payload');
    return this.rooms.createRoomByProfile(profileId, dto.room_title);
  }
}
