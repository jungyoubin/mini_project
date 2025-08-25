import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { HttpJwtGuard } from '../guards/jwt.guard';

@Controller('board')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  // Access Token 필요 (작성자 = 토큰의 sub)
  @UseGuards(HttpJwtGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateBoardDto) {
    const writerProfileId: string = req.user?.sub ?? req.user?.profile_id ?? req.user;
    return this.boardService.create(dto, writerProfileId);
  }
}
