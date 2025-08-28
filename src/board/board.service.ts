import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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

  // 좋아요
  async like(boardId: string, profileId: string) {
    // 게시글 존재 확인
    const exists = await this.boardModel.exists({ board_id: boardId });
    if (!exists) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    // true면 안 함
    const key = `board_liked_people.${profileId}`;
    const { modifiedCount } = await this.boardModel.updateOne(
      { board_id: boardId, [key]: { $ne: true } }, // 이미 true면 매치 안 됨
      { $set: { [key]: true } }, // 추가(또는 true로 세팅)
    );

    if (modifiedCount === 0) {
      // 게시글은 존재하지만 이미 좋아요 상태
      throw new BadRequestException('이미 좋아요를 눌렀습니다.');
    }

    // const like_count = await this.countLikes(boardId); // 추후에 좋아요 개수
    return { boardId, liked: true };
  }

  // 좋아요 취소
  async unlike(boardId: string, profileId: string) {
    // 게시글 존재 확인
    const exists = await this.boardModel.exists({ board_id: boardId });
    if (!exists) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    const key = `board_liked_people.${profileId}`;
    const { modifiedCount } = await this.boardModel.updateOne(
      { board_id: boardId, [key]: { $exists: true } }, // 키 없으면 매치 안 됨
      { $unset: { [key]: '' } }, // 보통적으로 '' 빈 값으로 쓴다고 함(ture로 써도 상관없음)
    );

    if (modifiedCount === 0) {
      // 게시글은 존재하지만 좋아요를 누르지 않았던 상태
      throw new BadRequestException('좋아요 상태가 아닙니다.');
    }

    // 추후에 좋아요 수 필요하면 아래 주석 제거
    // const like_count = await this.countLikes(board_id);
    return { boardId, liked: false };
  }

  // 좋아요 수 집계하기 추후에 필요시 아래 주석 확인하기
  // private async countLikes(boardId: string): Promise<number> {
  //   const [doc] = await this.boardModel.aggregate<{ board_liked_count: number }>([
  //     { $match: { board_id: boardId } },
  //     {
  //       $addFields: {
  //         board_liked_count: {
  //           $size: { $objectToArray: '$board_liked_people' }, // Map → array → size
  //         },
  //       },
  //     },
  //     { $project: { _id: 0, board_liked_count: 1 } },
  //   ]);

  //   return doc?.board_liked_count ?? 0;
  // }

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

  /*
  cf. === 를 쓰는 이유
  == 보다 === 가 엄격하다. === 는 데이터 타입도 확인하기 때문에
  a == 'a' true
  a === 'a' false
  */

  // 게시판 수정
  async modify(board_id: string, dto: ModifyBoardDto, writerProfileId: string) {
    if (dto.boardTitle === undefined && dto.boardContent === undefined) {
      throw new BadRequestException('수정할 필드가 없습니다. 제목 또는 콘텐츠 입력 바람');
    }

    const board = await this.boardModel.findOne({ board_id }).exec();
    if (!board) {
      throw new NotFoundException('게시글을 찾을 수 없다');
    }
    if (board.board_writer !== writerProfileId) {
      throw new NotFoundException('작성자만 수정이 가능하다');
    }

    if (dto.boardTitle !== undefined) board.board_title = dto.boardTitle;
    if (dto.boardContent !== undefined) board.board_content = dto.boardContent;
    board.board_m_date = new Date(); // 수정일 반영

    return board.save(); // 스키마 내용 그대로 적용하기
  }
}
