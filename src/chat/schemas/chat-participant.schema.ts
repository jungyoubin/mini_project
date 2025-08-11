// 채팅방 참여자 확인 DB

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatParticipantDocument = ChatParticipant & Document;

@Schema()
export class ChatParticipant {
  @Prop({ required: true })
  profile_id: string;

  @Prop({ required: true })
  room_id: string;
}

export const ChatParticipantSchema = SchemaFactory.createForClass(ChatParticipant);
