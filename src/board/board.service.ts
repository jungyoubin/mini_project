import { Injectable, NotFoundException } from '@nestjs/common';
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

  /* 
  lean() 함수
  쿼리의 결과를 JavaScript 객체로 반환한다. 
  이는 Mongoose 문서 인스턴스 대신 POJO(Plain Old JavaScript Object)를 반환함으로 성능 향상  
  
  .exec() 함수
  promise객체 반환 
  -> 쿼리가 실행되고 결과만 반환
  */
  // 전체 조회
  async findAll() {
    return (
      this.boardModel
        .find({}, { board_content: 0 }) // board_content : 0 으로 하여서 해당 내용은 안 가져오기
        // .sort({ board_date: -1 }) // 최신순으로 정렬이 필요하면 주석 제거하기
        .lean()
        .exec()
    );
  }

  // 개별 조회
  async findOne(board_id: string) {
    const doc = await this.boardModel.findOne({ board_id }).lean().exec();
    if (!doc) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    return doc;
  }
}
