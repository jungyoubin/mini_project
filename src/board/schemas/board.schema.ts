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

  @Prop({ type: [{ profile_id: { type: String, required: true } }], default: [] })
  board_liked_people: { profile_id: string }[];

  @Prop({ type: Number, default: 0 })
  board_liked_count: number;
}

export const BoardSchema = SchemaFactory.createForClass(Board);
