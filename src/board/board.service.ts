import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
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

    /*
    추후 좋아요 개수 반환 기능이 추가되었을때 사용되는 코드
    const likeCount = await this.countLikes(boardId);
    */
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

    /*
    추후 좋아요 개수 반환 기능이 추가되었을때 사용되는 코드
    const likeCount = await this.countLikes(boardId);
    */
    return { boardId };
  }

  /* 
  현재 좋아요 갯수에 대해서는 따로 언급되는 부분이 없지만, 
  추후 좋아요 갯수에 대해서 기능 요청이 생길때 하기 코드 반영
  
  private async countLikes(boardId: string): Promise<number> {
    const [doc] = await this.boardModel.aggregate<{ likeCount: number }>([
      { $match: { boardId } },
      {
        $project: {
          _id: 0,
          likeCount: { $size: { $objectToArray: '$boardLikedPeople' } },
        },
      },
    ]);
    return doc?.likeCount ?? 0;
  }

  */

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
  async findAll(limit: number, cursorDate?: string, cursorId?: string) {
    let filter: FilterQuery<BoardDocument> = {}; // MongoDB find()에 넘길 조건(처음에는 조건없음)

    // cursorId가 있으면, 그 글의 날짜 기준으로 "더 과거"만
    if (cursorDate && cursorId) {
      const boundaryDate = new Date(cursorDate);
      if (!isNaN(boundaryDate.getTime())) {
        // 유효한지 확인하기(아니면 getTime이 NaN 처리)
        filter = {
          $or: [
            { boardDate: { $lt: boundaryDate } }, // 날짜가 경계 날짜보다 더 이전인지
            { boardDate: boundaryDate, boardId: { $lt: cursorId } }, // 날짜가 같을때, 아이디가 더 작은지
          ],
        };
      }
    }

    const rows = await this.boardModel
      .find(filter, { boardContent: 0, _id: 0 }) // 내용 제외
      .sort({ boardDate: -1, boardId: -1 }) // 최신 → 과거 (DATE만 정렬)
      .limit(limit + 1) // hasMore 판별용 peek
      .lean()
      .exec();

    const hasMore = rows.length > limit; // limit 보다 많을 경우 limit + 1 개를 가져오기에
    const items = hasMore ? rows.slice(0, limit) : rows; // slice : 0부터 limit-1 까지

    const last = items.length ? items[items.length - 1] : null;
    const nextCursorDate = last ? (last.boardDate as Date).toISOString() : null;
    const nextCursorId = last ? String((last as any).boardId) : null;

    return { items, hasMore, nextCursorDate, nextCursorId };
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
