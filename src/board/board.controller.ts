import {
  Body,
  Controller,
  Post,
  Query,
  UseGuards,
  Get,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
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

  // 좋아요 하기
  @UseGuards(JwtAuthGuard)
  @Post(':boardId/like')
  async like(@Param('boardId') boardId: string, @ReqUser() user: JwtPayloadDto) {
    return this.boardService.like(boardId, user.sub);
  }

  // 좋아요 취소
  @UseGuards(JwtAuthGuard)
  @Delete(':boardId/like')
  async unlike(@Param('boardId') boardId: string, @ReqUser() user: JwtPayloadDto) {
    return this.boardService.unlike(boardId, user.sub);
  }

  // 게시판 삭제 -> 작성자만 가능하게
  @UseGuards(JwtAuthGuard)
  @Delete(':boardId')
  async remove(@Param('boardId') boardId: string, @ReqUser() user: JwtPayloadDto) {
    const writerProfileId: string = user.sub;
    return this.boardService.remove(boardId, writerProfileId);
  }

  // 전체 조회
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query('limit') limit = '5',
    @Query('cursorDate') cursorDate?: string,
    @Query('cursorId') cursorId?: string,
  ) {
    const lim = parseInt(limit, 10);
    return this.boardService.findAll(lim, cursorDate, cursorId);
  }

  // 개별 조회
  @UseGuards(JwtAuthGuard)
  @Get(':boardId')
  async findOne(@Param('boardId') boardId: string) {
    return this.boardService.findOne(boardId);
  }

  // 수정
  @UseGuards(JwtAuthGuard)
  @Patch(':boardId')
  async modify(
    @Param('boardId') boardId: string, // URL 경로 파라미터
    @ReqUser() user: JwtPayloadDto, // 요청 객체(req.user)
    @Body() dto: ModifyBoardDto, // 요청 바디 -> DTO 검증/ 변환
  ) {
    const writerProfileId: string = user.sub;

    return this.boardService.modify(boardId, dto, writerProfileId);
  }
}
