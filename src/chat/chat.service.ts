import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ChatRoom, ChatRoomDocument } from './schemas/chat-room.schema';

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
  ) {}

  // 채팅방에 profileId가 이미 있는지 없는지 검증
  async isParticipant(roomId: string, profileId: string): Promise<boolean> {
    const exists = await this.chatRoomModel
      .exists({
        room_id: roomId,
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
}
