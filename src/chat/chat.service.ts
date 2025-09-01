import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { v7 as uuidv7 } from 'uuid';
import { ChatRoom, ChatRoomDocument } from './schemas/chat-room.schema';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';

type RoomListItem = {
  roomId: string;
  roomTitle: string;
  roomDate: Date;
  participantCount: number;
  enterStatus: boolean;
  participants: { profileId: string }[];
};

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatRoom.name)
    private readonly chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatMessage.name)
    private readonly chatMessageModel: Model<ChatMessageDocument>,
  ) {}

  // roomId로 방 조회
  async findRoomById(roomId: string): Promise<ChatRoomDocument | null> {
    return this.chatRoomModel.findOne({ roomId }).exec(); // .exec()을 붙여서 확실히 Promise 리턴
  }

  // 방 생성하기
  async createRoom(profileId: string, roomTitle: string) {
    const doc = new this.chatRoomModel({
      roomId: uuidv4(),
      roomTitle: roomTitle,
      participants: new Map([[profileId, true]]),
    });

    const saved = await doc.save();

    return {
      roomId: saved.roomId,
      roomTitle: saved.roomTitle,
      roomDate: saved.roomDate.toISOString(),
      participantsMap: Object.fromEntries(saved.participants ?? []),
      participantCount: saved.participants?.size ?? 0,
    };
  }

  // 참가자 추가하기(Map에 키 추가)
  async addParticipant(roomId: string, profileId: string): Promise<{ added: boolean }> {
    const res = await this.chatRoomModel
      .updateOne(
        { roomId },
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
      .select({ roomId: 1, _id: 0 })
      .lean()
      .exec();

    return rows.map((r) => r.roomId);
  }

  // 채팅방에 profileId가 이미 있는지 없는지 검증
  async isParticipant(roomId: string, profileId: string): Promise<boolean> {
    const exists = await this.chatRoomModel
      .exists({
        roomId,
        [`participants.${profileId}`]: true,
      })
      .exec();
    return !!exists;
  }
  /*
  ! : 논리 부정(NOT)
  !!x : 두 번 부정해서 'x를 boolean 으로 강제 변환 -> true, false 로 변환
  즉 !!x == Boolean(x)
  없으면 false, 있으면 true 
  */

  // 전체 방
  async listAllRooms(profileId: string): Promise<RoomListItem[]> {
    const pipeline: PipelineStage[] = [
      // 파이프라인 타입 명시
      /*
      DB에 있는 문서를 응답용 형태로 서버에서 바꿔서 보내주기
      participants를 배열로 변환,
      participants 수 계산
      들어가있는지 enterStatus 확인
      최신방이 먼저 보이게 하기 
      */
      {
        $project: {
          _id: 0, // 사용할거면 '1'로 표시
          roomId: 1,
          roomTitle: 1,
          roomDate: 1,
          // Map은 객체와 유사하기에 $objectToArray: key : value 형태의 배열로 변환한다
          participantCount: { $size: { $objectToArray: '$participants' } },
          participants: {
            $map: {
              input: { $objectToArray: '$participants' },
              as: 'kv',
              in: { profileId: '$$kv.k' }, // 각 원소를 {profileId : 키}로 변환
            },
          },
          enterStatus: {
            $in: [
              profileId,
              {
                $map: {
                  input: { $objectToArray: '$participants' },
                  as: 'kv',
                  in: '$$kv.k',
                },
              },
            ],
          },
        },
      },
      { $sort: { roomDate: -1 as const } }, // -1을 literal 로 고정
    ];

    return this.chatRoomModel.aggregate<RoomListItem>(pipeline).exec();
  }

  // 사용자가 들어간 방
  async listMyRooms(profileId: string): Promise<RoomListItem[]> {
    const pipeline: PipelineStage[] = [
      { $match: { [`participants.${profileId}`]: true } }, // 인덱스 활용
      {
        $project: {
          _id: 0,
          roomId: 1,
          roomTitle: 1,
          roomDate: 1,
          participantCount: { $size: { $objectToArray: '$participants' } },
          participants: {
            $map: {
              input: { $objectToArray: '$participants' },
              as: 'kv',
              in: { profileId: '$$kv.k' },
            },
          },
          enterStatus: true, // match 로 이미 true
        },
      },
      { $sort: { roomDate: -1 as const } },
    ];

    return this.chatRoomModel.aggregate<RoomListItem>(pipeline).exec();
  }

  async sendMessage(roomId: string, profileId: string, content: string) {
    const now = new Date();
    const doc = await this.chatMessageModel.create({
      roomId,
      messageId: uuidv7(),
      profileId,
      messageContent: content,
      messageDate: now,
    });
    return doc.toObject();
  }

  // 최근 N개, cursor(이전 페이지의 가장 오래된 messageDate) 기준 더 가져오기
  async listMessages(roomId: string, limit = 50, cursor?: Date) {
    const q: any = { roomId };
    if (cursor) q.messageDate = { $lt: cursor };

    const rows = await this.chatMessageModel
      .find(q)
      .sort({ messageDate: -1 })
      .limit(limit)
      .lean()
      .exec();

    return rows;
  }
}
