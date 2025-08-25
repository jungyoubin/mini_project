import { Body, Controller, Post, Req, UseGuards, Patch, Param } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { ModifyBoardDto } from './dto/modify-board.dto';
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

  @UseGuards(HttpJwtGuard)
  @Patch(':board_id')
  async modify(
    @Param('board_id') board_id: string, // URL 경로 파라미터
    @Req() req: any, // 요청 객체(req.user)
    @Body() dto: ModifyBoardDto, // 요청 바디 -> DTO 검증/ 변환
  ) {
    const writerProfileId: string = req.user?.sub ?? req.user?.profile_id ?? req.user;
    return this.boardService.modify(board_id, dto, writerProfileId);
  }
}
