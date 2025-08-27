import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Board, BoardDocument } from './schemas/board.schema';
import { CreateBoardDto } from './dto/create-board.dto';

@Injectable()
export class BoardService {
  constructor(@InjectModel(Board.name) private boardModel: Model<BoardDocument>) {}

  async create(dto: CreateBoardDto, writerProfileId: string) {
    return this.boardModel.create({
      board_title: dto.boardTitle,
      board_content: dto.boardContent,
      board_writer: writerProfileId,
    });
  }

  // 게시판 삭제하기
  async remove(board_id: string, writerProfileId: string) {
    const board = await this.boardModel.findOne({ board_id }).exec();
    if (!board) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    if (board.board_writer !== writerProfileId) {
      throw new ForbiddenException('작성자만 삭제할 수 있습니다.');
    }

    await this.boardModel.deleteOne({ board_id }).exec();
    return { deleted: true, board_id, message: '게시판이 삭제되었습니다' };
  }
}
