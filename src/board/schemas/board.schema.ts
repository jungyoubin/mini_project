import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type BoardDocument = Board & Document;

@Schema({ collection: 'board_list', versionKey: false })
export class Board {
  @Prop({ type: String, default: uuidv4 })
  board_id: string;

  @Prop({ type: String, required: true, maxlength: 30, trim: true }) // 양 옆 공백 제거
  board_title: string;

  @Prop({ type: String, required: true, maxlength: 200, trim: true })
  board_content: string;

  @Prop({ type: Date, default: Date.now })
  board_date: Date;

  @Prop({ type: Date, default: null })
  board_m_date: Date | null;

  @Prop({ type: String, required: true }) // 작성자의 profile_id
  board_writer: string;

  /*
  조사하였을때, 스키마에서는 집합 플래그는 따로 없으며,
  좋아요를 추가 및 삭제를 진행할 때
  $addToSet / $pull을 사용하여 중복 없이 처리를 진행하려고 합니다.
  %addToSet 예시
  
  await this.boardModel.updateLike(
    { board_id },
    { $addToSet: { board_liked_people: { profile_id } } }
  );

  또는 합집합을 사용하여서 처리를 진행하려고 합니다.
  합집합을 사용하면 해당 배열을 집합으로 취급하고 중복을 제거한다(순서x)
  await this.boardModel.updateLike(
    { board_id },
    { $set: { board_liked_people: { $setUnion: [ "$board_liked_people", [ { profile_id } ] ] } } }
  );
  */

  @Prop({
    type: [
      {
        _id: false, // ← 서브도큐먼트 _id 생성 금지 (중복 방지)
        profile_id: { type: String, required: true, trim: true },
      },
    ],
    default: [],
  })
  board_liked_people: { profile_id: string }[];

  /* 
  좋아요 갯수에 대해서는 따로 저장하지 않고 필요할 때,
  다음과 같은 $size를 통하여서 집계하여서 사용하려고 합니다.
  board_liked_count: { $size: "$board_liked_people" }
  */
}

export const BoardSchema = SchemaFactory.createForClass(Board);
