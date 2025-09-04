import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { v7 as uuidv7 } from 'uuid';
import { ChatRoom, ChatRoomDocument } from './schemas/chat-room.schema';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
import { UserService } from 'src/user/user.service';
import { ChatGateway } from './chat.gateway';

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
    private readonly userService: UserService,

    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway, // Socket 조작
  ) {}

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

  // 전체 채팅방
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
            // 들어가있는 상태인지 확인
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
      { $sort: { roomDate: -1 } },
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
      { $sort: { roomDate: -1 } },
    ];

    return this.chatRoomModel.aggregate<RoomListItem>(pipeline).exec();
  }

  // roomId로 방 조회
  async findRoomById(roomId: string): Promise<ChatRoomDocument | null> {
    return this.chatRoomModel.findOne({ roomId }).exec(); // .exec()을 붙여서 확실히 Promise 리턴
  }

  async removeParticipant(roomId: string, profileId: string) {
    const updated = await this.chatRoomModel
      .findOneAndUpdate(
        { roomId, [`participants.${profileId}`]: true },
        { $unset: { [`participants.${profileId}`]: '' } },
        { new: true }, // 변경 후 문서 반환
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('참가자가 없거나 방이 존재하지 않습니다.');
    }

    // 남은 인원 수 계산
    const remaining = updated.participants.size;
    return { remaining, room: updated };
  }

  // 방 & 메시지 삭제
  async deleteRoomAndMessages(roomId: string) {
    const deletedRoom = await this.chatRoomModel
      .findOneAndDelete({
        roomId,
        $expr: {
          $eq: [
            { $size: { $objectToArray: '$participants' } }, // Map -> 배열 -> size
            0,
          ],
        },
      })
      .lean(); // 삭제된 문서 반환

    if (!deletedRoom) {
      // 이미 누가 지웠거나, 참가자가 아직 남아있는 상태
      return { roomDeleted: false, deletedMessageCount: 0 };
    }

    // 방이 삭제되었으니 메시지도 일괄 삭제
    const delMsg = await this.chatMessageModel.deleteMany({ roomId }).exec();

    return {
      roomDeleted: true,
      deletedMessageCount: delMsg.deletedCount ?? 0,
    };
  }

  // 방을 생성하고 자동으로 들어가기
  async createAndJoinRoom(profileId: string, roomTitle: string) {
    const exists = await this.userService.findByProfileId(profileId);
    if (!exists) throw new UnauthorizedException('유효하지 않는 사용자');

    const created = await this.createRoom(profileId, roomTitle);
    // 생성자 소켓을 room에 join
    await this.chatGateway.joinProfileToRoom(profileId, created.roomId);

    // 응답 형식
    const participants = Object.keys(created.participantsMap ?? {}).map((profileId) => ({
      profileId,
    }));
    return {
      roomId: created.roomId,
      roomTitle: created.roomTitle,
      roomDate: created.roomDate,
      participants,
    };
  }

  // 방 입장(DB 참가자 반영 + 소켓 join)
  async joinRoom(profileId: string, roomId: string) {
    const exists = await this.userService.findByProfileId(profileId);
    if (!exists) throw new UnauthorizedException('유효하지 않는 사용자');

    // 방 있는지 확인하기
    const room = await this.findRoomById(roomId);
    if (!room) throw new NotFoundException('room not found');

    // Participants 업데이트(있으면 패스)
    const already = await this.isParticipant(roomId, profileId);
    if (!already) await this.addParticipant(roomId, profileId);

    // socket join
    await this.chatGateway.joinProfileToRoom(profileId, roomId);

    return { roomId, alreadyParticipant: already };
  }

  // 방 나가기
  async leaveRoom(profileId: string, roomId: string) {
    const exists = await this.userService.findByProfileId(profileId);
    if (!exists) throw new UnauthorizedException('유효하지 않는 사용자');

    const room = await this.findRoomById(roomId);
    if (!room) throw new NotFoundException('room not found');

    const isMember = await this.isParticipant(roomId, profileId);
    if (!isMember) throw new NotFoundException('방 참여자가 아닙니다.');

    const { remaining } = await this.removeParticipant(roomId, profileId);
    await this.chatGateway.leaveProfileFromRoom(profileId, roomId);

    if (remaining === 0) {
      const { roomDeleted, deletedMessageCount } = await this.deleteRoomAndMessages(roomId);
      return {
        message: '퇴장 완료(방 삭제)',
        roomId,
        remainingParticipants: 0,
        roomDeleted: roomDeleted,
        deleted: { room: roomDeleted, message: deletedMessageCount },
      };
    }

    return {
      message: '퇴장 완료',
      roomId,
      remainingParticipants: remaining,
      roomDeleted: false,
    };
  }

  // 메시지 가져오기
  async getRoomMessages(roomId: string, limit: number, cursor?: Date) {
    const query: any = { roomId }; // 해당 방의 메시지만
    if (cursor) {
      query.messageDate = { $lt: cursor }; // cursor 이전(과거)만
    }

    const rows = await this.chatMessageModel
      .find(query)
      .sort({ messageDate: -1 }) // 최신 → 과거
      .limit(limit)
      .lean()
      .exec();

    if (rows.length === 0) {
      // 메시지 없으면 종료
      return { roomId, messages: [], nextCursor: null, hasMore: false };
    }

    // 메세지에 있는 profileIds 집합으로 가져오기
    const uniqueProfileIds = Array.from(new Set(rows.map((r: any) => r.profileId)));

    // 각 profileId의 userName 조회 (실패하면 null)
    const nameMap = new Map<string, string | null>();
    await Promise.all(
      uniqueProfileIds.map(async (profileId) => {
        const name = await this.userService.findName(profileId); // Promise<string | null>
        nameMap.set(profileId, name);
      }),
    );

    const messages = rows.map((r: any) => ({
      roomId: r.roomId,
      messageId: r.messageId,
      profileId: r.profileId,
      userName: nameMap.get(r.profileId) ?? null,
      messageContent: r.messageContent,
      messageDate: new Date(r.messageDate).toISOString(), // ISO 문자열로 통일
    }));

    // 다음 커서는 이번 페이지의 '가장 과거' 시간
    const last = rows[rows.length - 1];
    const nextCursor = new Date(last.messageDate).toISOString();

    // 마지막 시간보다 과거 문서 존재 여부만 확인
    const more = await this.chatMessageModel.exists({
      roomId,
      messageDate: { $lt: last.messageDate }, // $lt: ~~ : ~~ 보다 작은 문서 조회
    });
    const hasMore = !!more; // 있으면 true, 없으면 false

    return { roomId, messages, nextCursor, hasMore };
  }

  async sendMessage(roomId: string, profileId: string, messageContent: string) {
    const now = new Date();
    const doc = await this.chatMessageModel.create({
      roomId,
      messageId: uuidv7(),
      profileId,
      messageContent,
      messageDate: now,
    });
    return doc.toObject();
  }
}
