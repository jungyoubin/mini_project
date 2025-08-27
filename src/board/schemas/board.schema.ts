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

  // key = profile_id, value = true
  @Prop({ type: Map, of: Boolean, default: {} })
  board_liked_people: Map<string, boolean>;

  /*
  서비스 : 추가 / 삭제 
  const key = `board_liked_people.${profileId}`;

  추가
  await this.boardModel.updateOne(
    { board_id },
    { $set: { [key]: true } }  // board_liked_people[profileId] = true
  );

  삭제
  await this.boardModel.updateOne(
    { board_id },
    { $unset: { [key]: truer } }   // board_liked_people[profileId] 삭제
  );

  */

  /* 
  좋아요 갯수에 대해서는 따로 저장하지 않고 필요할 때,
  다음과 같은 $size를 통하여서 집계하여서 사용하려고 합니다.
  board_liked_count: { $size: "$board_liked_people" }
  */
}

export const BoardSchema = SchemaFactory.createForClass(Board);
