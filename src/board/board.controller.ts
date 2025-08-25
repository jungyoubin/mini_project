import { Body, Controller, Post, Req, UseGuards, Get, Param } from '@nestjs/common';
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

  // 전체 조회
  @UseGuards(HttpJwtGuard)
  @Get()
  async findAll() {
    const boards = await this.boardService.findAll();
    return { boards };
  }

  // 개별 조회
  @UseGuards(HttpJwtGuard)
  @Get(':board_id')
  async findOne(@Param('board_id') board_id: string) {
    return this.boardService.findOne(board_id);
  }
}
