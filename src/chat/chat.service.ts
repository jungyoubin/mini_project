import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatRoom, ChatRoomDocument } from './schemas/chat-room.schema';
import { ChatMessage } from './schemas/message.schema';
import { ChatParticipant, ChatParticipantDocument } from './schemas/chat-participant.schema';
import { v4 as uuidv4 } from 'uuid';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtPayloadDto } from 'src/user/auth/jwt-dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatParticipant.name) private participantModel: Model<ChatParticipantDocument>,
    @InjectModel(ChatMessage.name, 'messageConnection')
    private readonly messageModel: Model<ChatMessage>,
  ) {}

  // 방 만들기
  async createRoom(createRoomDto: CreateRoomDto, user: JwtPayloadDto) {
    const room = new this.chatRoomModel({
      ...createRoomDto,
      room_id: uuidv4(),
      room_date: new Date(),
      created_by: user.profile_id,
    });

    const savedRoom = await room.save();
    await this.joinRoom(savedRoom.room_id, user.profile_id);

    return savedRoom;
  }

  // 방 목록 조회
  async getAllRooms(): Promise<ChatRoom[]> {
    return this.chatRoomModel.find().select('-__v').exec();
  }

  // 방 입장
  async joinRoom(room_id: string, profile_id: string) {
    // 방 유효성 검사
    const room = await this.chatRoomModel.findOne({ room_id });
    if (!room) throw new NotFoundException('해당 방이 존재하지 않습니다.');

    const existing = await this.participantModel.findOne({ room_id, profile_id });
    if (!existing) {
      await this.participantModel.create({ room_id, profile_id });
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

  // 메시지 저장
  async saveMessage({
    message_id,
    profile_id,
    room_id,
    chat_message,
  }: {
    message_id: string;
    profile_id: string;
    room_id: string;
    chat_message: string;
  }) {
    return await this.messageModel.create({
      message_id,
      profile_id,
      room_id,
      chat_message,
      chat_date: new Date(),
    });
  }

  // 메시지 삭제
  async deleteRoomAndMessages(room_id: string) {
    await this.chatRoomModel.deleteOne({ room_id });
    await this.messageModel.deleteMany({ room_id });
  }
}
