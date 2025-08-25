// src/chat/schemas/chat-room.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatRoomDocument = HydratedDocument<ChatRoom>;

@Schema({
  collection: 'chat_rooms',
  timestamps: { createdAt: 'room_date', updatedAt: false },
})
export class ChatRoom {
  @Prop({ type: String, required: true })
  room_id: string; // uuidv4

  @Prop({ type: String, required: true })
  room_title: string;

  @Prop({
    type: [{ profile_id: { type: String, required: true } }],
    default: [],
    validate: [(v: any[]) => v.length <= 100, 'participants up to 100'],
  })
  participants: Array<{ profile_id: string }>;

  @Prop({ type: Date, default: Date.now })
  room_date: Date;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);
