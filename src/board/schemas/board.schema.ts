import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type BoardDocument = Board & Document;

@Schema({ collection: 'boardList', versionKey: false })
export class Board {
  @Prop({ type: String, default: uuidv4 })
  boardId: string;

  @Prop({ type: String, required: true, maxlength: 30, trim: true }) // 양 옆 공백 제거
  boardTitle: string;

  @Prop({ type: String, required: true, maxlength: 200, trim: true })
  boardContent: string;

  @Prop({ type: Date, default: Date.now })
  boardDate: Date;

  @Prop({ type: Date, default: null })
  boardModifiedDate: Date | null;

  @Prop({ type: String, required: true }) // 작성자의 profileId
  boardWriter: string;

  // key = profileId, value = true
  @Prop({ type: Map, of: Boolean, default: {} })
  boardLikedPeople: Map<string, boolean>;
  /* 
  좋아요 갯수에 대해서는 따로 저장하지 않고 필요할 때,
  다음과 같은 $size를 통하여서 집계하여서 사용하려고 합니다.
  boardLikedCount: { $size: "$boardLikedPeople" }
  */
}
export const BoardSchema = SchemaFactory.createForClass(Board);
