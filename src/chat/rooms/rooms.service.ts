import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { MongoClient } from 'mongodb';
import type { Collection } from 'mongodb';
import type { ChatRoomDocument } from '../schemas/chat-room.schema';

@Injectable()
export class RoomsService implements OnModuleInit, OnModuleDestroy {
  private client!: MongoClient;
  private col!: Collection<ChatRoomDocument>;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const uri = this.config.get<string>('mongo.uri');
    const dbName = this.config.get<string>('mongo.dbName') ?? 'project';
    if (!uri) throw new Error('Missing mongo.uri');

    this.client = new MongoClient(uri);
    await this.client.connect();

    const db = this.client.db(dbName);
    this.col = db.collection<ChatRoomDocument>('chat_rooms');

    await this.col.createIndex({ room_id: 1 }, { unique: true });
  }

  // 앱 종료 시 커넥션 정리
  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
    }
  }

  // room_id를 통하여서 방 조회하기(있는지 없는지)
  async findRoomById(roomId: string): Promise<ChatRoomDocument | null> {
    return this.col.findOne({ room_id: roomId });
  }

  // 액세스 토큰의 profile_id로 방 생성.
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
}
