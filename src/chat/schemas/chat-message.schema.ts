import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

@Schema({ collection: 'chatMessages', timestamps: false, versionKey: false })
export class ChatMessage {
  @Prop({ type: String, required: true, index: true })
  roomId: string; // 방 ID

  @Prop({ type: String, required: true, unique: true })
  messageId: string; // uuidv7

  @Prop({ type: String, required: true })
  profileId: string; // 작성자 ID

  @Prop({ type: String, required: true, maxlength: 200 })
  messageContent: string;

  @Prop({ type: Date, required: true, index: true })
  messageDate: Date; // 생성 시간
}
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// 조회용 복합 인덱스 (room별 시간 순)
ChatMessageSchema.index({ roomId: 1, messageDate: -1 });
