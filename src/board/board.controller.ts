import { Body, Controller, Post, Req, UseGuards, Delete, Param } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { ReqUser } from '../common/decorators/user.decorator';
import type { JwtPayloadDto } from 'src/common/payload/jwt-dto';

@UseGuards(JwtAuthGuard)
@Controller('board')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  // Access Token 필요 (작성자 = 토큰의 sub)
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@ReqUser() user: JwtPayloadDto, @Body() dto: CreateBoardDto) {
    return this.boardService.create(dto, user.sub);
  }

  // 좋아요 하기
  @UseGuards(JwtAuthGuard)
  @Post(':board_id/like')
  async like(@Param('board_id') board_id: string, @ReqUser() user: JwtPayloadDto) {
    return this.boardService.like(board_id, user.sub);
  }

  // 좋아요 취소
  @UseGuards(JwtAuthGuard)
  @Delete(':board_id/like')
  async unlike(@Param('board_id') board_id: string, @ReqUser() user: JwtPayloadDto) {
    return this.boardService.unlike(board_id, user.sub);
  }
}
