import { Body, Controller, Post, Req, UseGuards, Patch, Param } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { ModifyBoardDto } from './dto/modify-board.dto';
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

  // 전체 조회
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    const boards = await this.boardService.findAll();
    return { boards };
  }

  // 개별 조회
  @UseGuards(JwtAuthGuard)
  @Get(':board_id')
  async findOne(@Param('board_id') board_id: string) {
    return this.boardService.findOne(board_id);

  // 수정
  @UseGuards(JwtAuthGuard)
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
