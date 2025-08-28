import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ChatRoom, ChatRoomDocument } from './schemas/chat-room.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatRoom.name)
    private readonly chatRoomModel: Model<ChatRoomDocument>,
  ) {}

  // room_id로 방 조회
  async findRoomById(roomId: string): Promise<ChatRoomDocument | null> {
    return this.chatRoomModel.findOne({ room_id: roomId }).exec(); // .exec()을 붙여서 확실히 Promise 리턴
  }

  async createRoomByProfile(profileId: string, roomTitle: string) {
    const doc = new this.chatRoomModel({
      room_id: uuidv4(),
      room_title: roomTitle,
      participants: new Map([[profileId, true]]),
    });

    const saved = await doc.save();

    return {
      room_id: saved.room_id,
      room_title: saved.room_title,
      room_date: saved.room_date.toISOString(),
      participants_map: Object.fromEntries(saved.participants ?? []),
      participant_count: saved.participants?.size ?? 0,
    };
  }

  // 참가자 추가하기(Map에 키 추가)
  async addParticipant(roomId: string, profileId: string): Promise<{ added: boolean }> {
    const res = await this.chatRoomModel
      .updateOne(
        { room_id: roomId },
        { $set: { [`participants.${profileId}`]: true } }, // 키만 추가
        { upsert: false },
      )
      .exec();
    // modifiedCount === 1 이면 participants 변경 발생
    return { added: res.modifiedCount === 1 };
  }

  /*
   사용자가 속한 채팅방 ID 목록 반환
   소켓 연결 시 기존 방 재-join에 사용됨
   Map 키 존재 검사
  */
  async findRoomIdsByMember(profileId: string): Promise<string[]> {
    const rows = await this.chatRoomModel
      .find({ [`participants.${profileId}`]: true })
      .select({ room_id: 1, _id: 0 })
      .lean()
      .exec();

    return rows.map((r) => r.room_id);
  }
}
