import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Board, BoardDocument } from './schemas/board.schema';
import { CreateBoardDto } from './dto/create-board.dto';
import { ModifyBoardDto } from './dto/modify-board.dto';

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

  /*
  cf. === 를 쓰는 이유
  == 보다 === 가 엄격하다. === 는 데이터 타입도 확인하기 때문에
  a == 'a' true
  a === 'a' false
  */
   
  // 게시판 수정
  async modify(board_id: string, dto: ModifyBoardDto, writerProfileId: string) {

    if (dto.board_title === undefined && dto.board_content === undefined) {
      throw new BadRequestException('수정할 필드가 없습니다. 제목 또는 콘텐츠 입력 바람');
    }

    const board = await this.boardModel.findOne({ board_id }).exec();
    if (!board) {
      throw new NotFoundException('게시글을 찾을 수 없다');
    }
    if (board.board_writer !== writerProfileId) {
      throw new NotFoundException('작성자만 수정이 가능하다');
    }

    if (dto.board_title !== undefined) board.board_title = dto.board_title;
    if (dto.board_content !== undefined) board.board_content = dto.board_content;
    board.board_m_date = new Date(); // 수정일 반영

    return board.save(); // 스키마 내용 그대로 적용하기

  }
}
