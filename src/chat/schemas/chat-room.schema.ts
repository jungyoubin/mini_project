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
    type: Map,
    of: Boolean,
    default: {},
    validate: {
      validator: (v?: Map<string, boolean>) => !v || v.size <= 100,
      message: 'participants up to 100', // 참가자 최대 100명
    },
  })
  participants: Map<string, boolean>;

  @Prop({ type: Date, default: Date.now })
  room_date: Date;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

ChatRoomSchema.index({ 'participants.$**': 1 });
ChatRoomSchema.index({ room_id: 1 }, { unique: true });
