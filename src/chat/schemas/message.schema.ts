// 메시지 저장되는 db

import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class ChatMessage extends Document {
  @Prop({ required: true })
  message_id: string;

  @Prop({ required: true })
  profile_id: string;

  @Prop({ required: true })
  room_id: string;

  @Prop({ required: true })
  chat_message: string;

  @Prop({ required: true, default: Date.now })
  chat_date: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
