import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Board, BoardDocument } from './schemas/board.schema';
import { CreateBoardDto } from './dto/create-board.dto';

@Injectable()
export class BoardService {
  constructor(@InjectModel(Board.name) private boardModel: Model<BoardDocument>) {}

  async create(dto: CreateBoardDto, writerProfileId: string) {
    return this.boardModel.create({
      board_title: dto.board_title,
      board_content: dto.board_content,
      board_writer: writerProfileId,
    });
  }
}
