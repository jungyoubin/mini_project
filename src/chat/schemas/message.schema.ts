import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;
@Schema({ versionKey: false, collection: 'message' })
export class ChatMessage extends Document {
  @Prop({ required: true })
  message_id: string;

  @Prop({ required: true })
  profile_id: string;

  @Prop({ required: true, index: true })
  room_id: string;

  @Prop({ required: true })
  user_name: string;

  @Prop({ required: true })
  chat_message: string;

  @Prop({ required: true, default: Date.now, index: true })
  chat_date: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// message는 전체 메시지를 관리
ChatMessageSchema.index({ room_id: 1, chat_date: -1 }); // 조회 편하게 하기 위해서
