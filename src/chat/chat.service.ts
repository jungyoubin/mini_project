import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatRoom, ChatRoomDocument } from './schemas/chat-room.schema';
import { ChatMessage, ChatMessageDocument } from './schemas/message.schema';
import { ChatParticipant, ChatParticipantDocument } from './schemas/chat-participant.schema';
import { v4 as uuidv4 } from 'uuid';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtPayloadDto } from 'src/user/auth/jwt-dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatParticipant.name) private participantModel: Model<ChatParticipantDocument>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
  ) {}

  // 방 만들기 (생성자 자동 참여)
  async createRoom(createRoomDto: CreateRoomDto, user: JwtPayloadDto) {
    const room = new this.chatRoomModel({
      room_id: uuidv4(),
      room_date: new Date(),
      room_title: createRoomDto.room_title,
      created_by: user.profile_id,
    });

    const savedRoom = await room.save();
    await this.joinRoom(savedRoom.room_id, user.profile_id);

    return savedRoom;
  }

  // 방 목록 조회
  async getAllRooms(): Promise<ChatRoom[]> {
    return this.chatRoomModel.find().select('-__v').lean().exec();
  }

  // 개별 방 조회
  async getRoom(room_id: string): Promise<ChatRoom> {
    const room = await this.chatRoomModel.findOne({ room_id }).lean().exec();
    if (!room) throw new NotFoundException('해당 방이 존재하지 않습니다.');
    return room;
  }

  // 방 입장
  async joinRoom(room_id: string, profile_id: string) {
    // 방 유효성 검사
    const room = await this.chatRoomModel.findOne({ room_id });
    if (!room) throw new NotFoundException('해당 방이 존재하지 않습니다.');

    try {
      await this.participantModel.create({ room_id, profile_id });
    } catch (err) {
      // 이미 참가 중이면 무시(유니크 인덱스 충돌)
    }
    return { message: '방 입장 완료' };
  }

  // 방 나가기
  async leaveRoom(room_id: string, profile_id: string) {
    await this.participantModel.deleteOne({ room_id, profile_id });

    const remaining = await this.participantModel.countDocuments({ room_id });
    if (remaining === 0) {
      await this.chatRoomModel.deleteOne({ room_id });
      await this.messageModel.deleteMany({ room_id }); // 메시지도 삭제
      return { message: '모든 유저가 나가 방이 삭제되었습니다.' };
    }

    return { message: '퇴장 완료' };
  }
}
