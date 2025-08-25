import { Body, Controller, Post, Req, UseGuards, Delete, Param } from '@nestjs/common';
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

  // 게시판 삭제 -> 작성자만 가능하게
  @UseGuards(HttpJwtGuard)
  @Delete(':board_id')
  async remove(@Param('board_id') board_id: string, @Req() req: any) {
    const writerProfileId: string = req.user?.sub ?? req.user?.profile_id ?? req.user;
    return this.boardService.remove(board_id, writerProfileId);
  }
}
