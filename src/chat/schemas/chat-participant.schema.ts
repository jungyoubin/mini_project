import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatParticipantDocument = ChatParticipant & Document;

@Schema({ versionKey: false, timestamps: true, collection: 'chat' })
export class ChatParticipant {
  @Prop({ required: true })
  profile_id: string;

  @Prop({ required: true })
  room_id: string;

  @Prop({ required: true })
  user_name: string;
}

export const ChatParticipantSchema = SchemaFactory.createForClass(ChatParticipant);

// 같은 유저가 같은 방에 중복 입장 금지
ChatParticipantSchema.index({ room_id: 1, profile_id: 1 }, { unique: true });
