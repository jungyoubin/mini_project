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

  // 좋아요 하기
  @UseGuards(HttpJwtGuard)
  @Post(':board_id/like')
  async like(@Param('board_id') board_id: string, @Req() req: any) {
    const profileId: string = req.user?.sub ?? req.user?.profile_id ?? req.user;
    return this.boardService.like(board_id, profileId);
  }

  // 좋아요 취소
  @UseGuards(HttpJwtGuard)
  @Delete(':board_id/like')
  async unlike(@Param('board_id') board_id: string, @Req() req: any) {
    const profileId: string = req.user?.sub ?? req.user?.profile_id ?? req.user;
    return this.boardService.unlike(board_id, profileId);
  }
}
