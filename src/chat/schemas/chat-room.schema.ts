// 채팅방 DB

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatRoomDocument = ChatRoom & Document;

@Schema({ versionKey: false })
export class ChatRoom {
  @Prop({ type: String, required: true, unique: true })
  room_id: string;

  @Prop({ type: Date, required: true })
  room_date: Date;

  @Prop({ type: String, required: true })
  room_title: string;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);
