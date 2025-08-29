import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ChatRoom, ChatRoomDocument } from './schemas/chat-room.schema';
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
}
