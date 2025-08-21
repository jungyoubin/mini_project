import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { MongoClient, Collection } from 'mongodb';
import { Namespace } from 'socket.io';
export interface ChatRoomParticipant {
  profile_id: string; // 참가자 프로필 ID
}

export interface ChatRoomDocument {
  room_id: string; // 채팅방 고유 ID (uuid)
  room_title: string; // 채팅방 제목
  room_date: Date; // 생성일
  participants: ChatRoomParticipant[]; // 참가자 목록
}

@Injectable()
export class RoomsService implements OnModuleInit, OnModuleDestroy {
  private client!: MongoClient;
  private col!: Collection<ChatRoomDocument>;
  private nsp!: Namespace; // Gateway가 넘겨줄 socket.io namespace

  constructor(private readonly config: ConfigService) {}

  setNamespace(nsp: Namespace) {
    // gateway에서 afterInit 호출하기
    this.nsp = nsp;
  }

  // 애플리케이션 시작 시 Mongo 연결 및 인덱스 구현
  async onModuleInit() {
    const uri = this.config.get<string>('mongo.uri');
    const dbName = this.config.get<string>('mongo.dbName') ?? 'project';
    if (!uri) throw new Error('Missing mongo.uri');

    this.client = new MongoClient(uri);
    await this.client.connect();

    const db = this.client.db(dbName);
    this.col = db.collection<ChatRoomDocument>('chat_rooms');

    // room_id 유일성 보장
    await this.col.createIndex({ room_id: 1 }, { unique: true });
    // 사용자가 속한 방을 빠르게 찾기 위한 역색인
    await this.col.createIndex({ 'participants.profile_id': 1 });
  }

  // 애플리케이션 종료 시 Mongo 연결 정리
  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
    }
  }

  // room_id로 방 조회
  async findRoomById(roomId: string): Promise<ChatRoomDocument | null> {
    return this.col.findOne({ room_id: roomId });
  }

  // 액세스 토큰의 profile_id로 방 생성
  async createRoomByProfile(profileId: string, roomTitle: string) {
    const room: ChatRoomDocument = {
      room_id: uuidv4(),
      room_title: roomTitle,
      room_date: new Date(),
      participants: [{ profile_id: profileId }],
    };

    await this.col.insertOne(room);

    return {
      room_id: room.room_id,
      room_title: room.room_title,
      room_date: room.room_date.toISOString(),
      participants: room.participants,
    };
  }

  // socket room 확인 누가 있는지
  async getMembers(roomId: string): Promise<string[]> {
    if (!this.nsp) return []; // 아직 afterInit 전이라면 빈 배열
    // Socket.IO adapter에서 방에 속한 소켓 ID 조회
    const sockets = await this.nsp.in(roomId).allSockets();
    return Array.from(sockets); // ["socketId1", "socketId2", ...]
  }

  /*
   사용자가 속한 채팅방 ID 목록 반환
   소켓 연결 시 기존 방 재-join에 사용됨
   */
  async findRoomIdsByMember(profileId: string): Promise<string[]> {
    const cursor = this.col
      .find({ 'participants.profile_id': profileId })
      .project<{ room_id: string }>({ room_id: 1, _id: 0 });

    const ids: string[] = [];
    for await (const doc of cursor) {
      ids.push(doc.room_id);
    }
    return ids;
  }

  // 전체 채팅방 목록 조회
  async listRooms(profileId: string): Promise<
    Array<{
      room_id: string;
      room_title: string;
      participants: { profile_id: string }[];
      participant_count: number;
      enter_status: boolean; // 들어갔으면 true, 아니면 false
      room_date: string; // ISO8601
    }>
  > {
    const pipeline = [
      // participants에서 profile_id만 뽑아 배열로 만들기 -> 내가 들어간지 확인하기 위해
      {
        $addFields: {
          _participantIds: {
            $map: { input: '$participants', as: 'p', in: '$$p.profile_id' },
          },
        },
      },
      // participant_count / enter_status 계산
      {
        $addFields: {
          participant_count: { $size: '$_participantIds' },
          enter_status: { $in: [profileId, '$_participantIds'] },
        },
      },
      // 사용할 부분만 1로 하기
      {
        $project: {
          _id: 0,
          room_id: 1,
          room_title: 1,
          participants: 1,
          participant_count: 1,
          enter_status: 1,
          room_date: 1,
        },
      },
      { $sort: { room_date: -1 } }, // 최신순으로 하기(일단은 최신순으로 하자)
    ];

    const cursor = this.col.aggregate<{
      room_id: string;
      room_title: string;
      participants: { profile_id: string }[];
      participant_count: number;
      enter_status: boolean;
      room_date: Date;
    }>(pipeline);

    const out: Array<{
      room_id: string;
      room_title: string;
      participants: { profile_id: string }[];
      participant_count: number;
      enter_status: boolean;
      room_date: string;
    }> = [];

    for await (const doc of cursor) {
      out.push({
        room_id: doc.room_id,
        room_title: doc.room_title,
        participants: doc.participants ?? [],
        participant_count: doc.participant_count ?? doc.participants?.length ?? 0,
        enter_status: !!doc.enter_status,
        room_date: doc.room_date.toISOString(),
      });
    }

    return out;
  }

  // 내가 속한 방만(전체 x) 보여주기
  async listMyRooms(profileId: string): Promise<
    Array<{
      room_id: string;
      room_title: string;
      participants: { profile_id: string }[];
      participant_count: number;
      room_date: string; // ISO8601
    }>
  > {
    const pipeline = [
      // 내가 멤버인 방만 필터
      { $match: { 'participants.profile_id': profileId } },
      // participants 길이 계산
      {
        $addFields: {
          participant_count: { $size: '$participants' },
        },
      },
      {
        $project: {
          _id: 0,
          room_id: 1,
          room_title: 1,
          participants: 1,
          participant_count: 1,
          room_date: 1,
        },
      },
      { $sort: { room_date: -1 } },
    ];

    const cursor = this.col.aggregate<{
      room_id: string;
      room_title: string;
      participants: { profile_id: string }[];
      participant_count: number;
      room_date: Date;
    }>(pipeline);

    const out: Array<{
      room_id: string;
      room_title: string;
      participants: { profile_id: string }[];
      participant_count: number;
      room_date: string;
    }> = [];

    for await (const doc of cursor) {
      out.push({
        room_id: doc.room_id,
        room_title: doc.room_title,
        participants: doc.participants ?? [],
        participant_count: doc.participant_count ?? doc.participants?.length ?? 0,
        room_date: doc.room_date.toISOString(),
      });
    }

    return out;
  }
}
