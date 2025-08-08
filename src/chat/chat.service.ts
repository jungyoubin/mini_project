import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatRoom, ChatRoomDocument } from './schemas/chat-room.schema';
import { v4 as uuidv4 } from 'uuid';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class ChatService {
  constructor(@InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoomDocument>) {}

  async createRoom(createRoomDto: CreateRoomDto, user: any) {
    console.log('방 만든 사용자:', user);

    const room = new this.chatRoomModel({
      ...createRoomDto,
      room_id: uuidv4(),
      room_date: new Date(),
    });

    return room.save();
  }

  async getAllRooms(): Promise<ChatRoom[]> {
    return this.chatRoomModel.find().exec();
  }
}
