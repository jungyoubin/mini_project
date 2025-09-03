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
      boardTitle: dto.boardTitle,
      boardContent: dto.boardContent,
      boardWriter: writerProfileId,
    });
  }

  // 좋아요
  async like(boardId: string, profileId: string) {
    // 게시글 존재 확인
    const exists = await this.boardModel.exists({ boardId });
    if (!exists) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    const now = new Date();
    const key = `boardLikedPeople.${profileId}`;

    await this.boardModel
      .updateOne({ boardId }, { $set: { [key]: now } }, { upsert: false })
      .exec();

    // 개수 반환
    // const likeCount = await this.countLikes(boardId);
    return { boardId, likedAt: now };
  }

  // 좋아요 취소
  async unlike(boardId: string, profileId: string) {
    // 게시글 존재 확인
    const exists = await this.boardModel.exists({ boardId });
    if (!exists) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    const key = `boardLikedPeople.${profileId}`;

    // 상태와 무관하게 항상 unset
    await this.boardModel.updateOne({ boardId }, { $unset: { [key]: '' } }).exec();

    // const likeCount = await this.countLikes(boardId);
    return { boardId };
  }

  // 좋아요 수 집계하기 추후에 필요시 아래 주석 확인하기
  // private async countLikes(boardId: string): Promise<number> {
  //   const [doc] = await this.boardModel.aggregate<{ likeCount: number }>([
  //     { $match: { boardId } },
  //     {
  //       $project: {
  //         _id: 0,
  //         likeCount: { $size: { $objectToArray: '$boardLikedPeople' } },
  //       },
  //     },
  //   ]);
  //   return doc?.likeCount ?? 0;
  // }

  // 게시판 삭제하기
  async remove(boardId: string, writerProfileId: string) {
    const board = await this.boardModel.findOne({ boardId }).exec();
    if (!board) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    if (board.boardWriter !== writerProfileId) {
      throw new ForbiddenException('작성자만 삭제할 수 있습니다.');
    }

    await this.boardModel.deleteOne({ boardId }).exec();
    return { deleted: true, boardId, message: '게시판이 삭제되었습니다' };
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
        .find({}, { boardContent: 0 }) // boardContent : 0 으로 하여서 해당 내용은 안 가져오기
        // .sort({ boardDate: -1 }) // 최신순으로 정렬이 필요하면 주석 제거하기
        .lean()
        .exec()
    );
  }

  // 개별 조회
  async findOne(boardId: string) {
    const doc = await this.boardModel.findOne({ boardId }).lean().exec();
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
  async modify(boardId: string, dto: ModifyBoardDto, writerProfileId: string) {
    if (dto.boardTitle === undefined && dto.boardContent === undefined) {
      throw new BadRequestException('수정할 필드가 없습니다. 제목 또는 콘텐츠 입력 바람');
    }

    const board = await this.boardModel.findOne({ boardId }).exec();
    if (!board) {
      throw new NotFoundException('게시글을 찾을 수 없다');
    }
    if (board.boardWriter !== writerProfileId) {
      throw new NotFoundException('작성자만 수정이 가능하다');
    }

    if (dto.boardTitle !== undefined) board.boardTitle = dto.boardTitle;
    if (dto.boardContent !== undefined) board.boardContent = dto.boardContent;
    board.boardModifiedDate = new Date(); // 수정일 반영

    return board.save(); // 스키마 내용 그대로 적용하기
  }
}
