import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
}
