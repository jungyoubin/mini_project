import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatRoomDocument = HydratedDocument<ChatRoom>;

@Schema({
  collection: 'chatRooms',
  timestamps: { createdAt: 'roomDate', updatedAt: false },
  versionKey: false,
})
export class ChatRoom {
  @Prop({ type: String, required: true })
  roomId: string; // uuidv4

  @Prop({ type: String, required: true })
  roomTitle: string;

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

  roomDate: Date;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

ChatRoomSchema.index({ 'participants.$**': 1 });

ChatRoomSchema.index({ roomId: 1 }, { unique: true });
