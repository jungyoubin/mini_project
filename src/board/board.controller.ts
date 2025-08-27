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

  // 게시판 삭제 -> 작성자만 가능하게
  @UseGuards(JwtAuthGuard)
  @Delete(':board_id')
  async remove(@Param('board_id') board_id: string, @Req() req: any) {
    const writerProfileId: string = req.user?.sub ?? req.user?.profile_id ?? req.user;
    return this.boardService.remove(board_id, writerProfileId);
  }
}
