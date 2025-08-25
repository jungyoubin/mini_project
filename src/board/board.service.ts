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
      board_title: dto.board_title,
      board_content: dto.board_content,
      board_writer: writerProfileId,
    });
  }

  // 좋아요 추가
  async like(board_id: string, profile_id: string) {
    const board = await this.boardModel.findOne({ board_id }).exec();
    if (!board) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    // 했는지 여부 확인하기
    const already = board.board_liked_people.some((p) => p.profile_id === profile_id);
    if (already) throw new BadRequestException('이미 좋아요한 게시글입니다.');

    board.board_liked_people.push({ profile_id }); // profile_id 넣기
    board.board_liked_count = board.board_liked_people.length;
    await board.save();

    // 필드 추가하고 싶으면 아래에 더 추가하기
    return {
      message: '좋아요를 눌렀습니다',
      board_id: board.board_id,
      board_liked_count: board.board_liked_count,
      board_liked_people: board.board_liked_people,
    };
  }

  // 좋아요 취소
  async unlike(board_id: string, profile_id: string) {
    const board = await this.boardModel.findOne({ board_id }).exec();
    if (!board) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    const before = board.board_liked_people.length;
    board.board_liked_people = board.board_liked_people.filter((p) => p.profile_id !== profile_id);

    if (board.board_liked_people.length === before) {
      throw new BadRequestException('아직 좋아요하지 않은 게시글입니다.');
    }

    board.board_liked_count = board.board_liked_people.length;
    await board.save();

    return {
      message: '좋아요를 취소하였습니다',
      board_id: board.board_id,
      board_liked_count: board.board_liked_count,
      board_liked_people: board.board_liked_people,
    };
  }
}
