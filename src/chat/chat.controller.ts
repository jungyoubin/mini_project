import {
  Body,
  Controller,
  Post,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Param,
  Get,
  Delete,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { ChatGateway } from './chat.gateway';
import { ReqUser } from '../common/decorators/user.decorator';
import { JwtPayloadDto } from 'src/common/payload/jwt-dto';
import { UserService } from 'src/user/user.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway, // socket
    private readonly userService: UserService,
  ) {}

  // 방 생성
  @UseGuards(JwtAuthGuard)
  @Post('room')
  async create(@ReqUser() user: JwtPayloadDto, @Body() dto: CreateRoomDto) {
    const profileId = user.sub;
    const exists = await this.userService.findByProfileId(user.sub);
    if (!exists) {
      throw new UnauthorizedException('유효하지 않는 사용자');
    }

    // 방 생성
    const room = await this.chatService.createRoom(profileId, dto.roomTitle);

    // DB의 참가자 추가
    await this.chatService.addParticipant(room.roomId, profileId);

    // 생성자의 socket을 해당 room에 join하기
    await this.chatGateway.joinProfileToRoom(profileId, room.roomId);

    // 응답 확인을 위해 participants에 넣기
    const participants = Object.keys(room.participantsMap ?? {}).map((profileId) => ({
      profileId,
    }));

    return {
      roomId: room.roomId,
      roomTitle: room.roomTitle,
      roomDate: room.roomDate,
      participants,
    };
  }

  // Socket Room 멤버 목록 조회(잘 들어갔는지 확인용)
  @UseGuards(JwtAuthGuard)
  @Get('room/:roomId/members')
  async members(@Param('roomId') roomId: string) {
    return this.chatGateway.getRoomMembers(roomId);
  }

  // 방 들어가기
  @UseGuards(JwtAuthGuard)
  @Post('room/:roomId/join')
  async join(@ReqUser() user: JwtPayloadDto, @Param('roomId') roomId: string) {
    const profileId = user.sub;
    const exists = await this.userService.findByProfileId(profileId);
    if (!exists) {
      throw new UnauthorizedException('유효하지 않는 사용자');
    }

    // 방 있는지 확인하기
    const room = await this.chatService.findRoomById(roomId);
    if (!room) throw new NotFoundException('room not found');

    // Participants 업데이트(있으면 패스)
    const already = await this.chatService.isParticipant(roomId, profileId);
    if (!already) {
      await this.chatService.addParticipant(roomId, profileId);
    }

    //소켓 join
    await this.chatGateway.joinProfileToRoom(profileId, roomId);

    return {
      roomId,
      alreadyParticipant: already, // true면 기존 멤버였음, false는 신규 입장
    };
  }

  // 전체 채팅방 가져오기
  @UseGuards(JwtAuthGuard)
  @Get('rooms')
  async getRooms(@ReqUser() user: JwtPayloadDto) {
    const exists = await this.userService.findByProfileId(user.sub);
    if (!exists) {
      throw new UnauthorizedException('유효하지 않는 사용자');
    }
  }

  // 내가 들어간 채팅방만 가져오기
  @UseGuards(JwtAuthGuard)
  @Get('/myrooms')
  async getMyRooms(@ReqUser() user: JwtPayloadDto) {
    const exists = await this.userService.findByProfileId(user.sub);
    if (!exists) {
      throw new UnauthorizedException('유효하지 않는 사용자');
    }
  }

  // 방 나가기
  @UseGuards(JwtAuthGuard)
  @Delete(':roomId')
  async leaveRoom(@ReqUser() user: JwtPayloadDto, @Param('roomId') roomId: string) {
    const profileId = user.sub;
    const exists = await this.userService.findByProfileId(profileId);
    if (!exists) {
      throw new UnauthorizedException('유효하지 않는 사용자');
    }
    // 방 존재 확인
    const room = await this.chatService.findRoomById(roomId);
    if (!room) throw new NotFoundException('room not found');

    // 참가자 여부 확인
    const isMember = await this.chatService.isParticipant(roomId, profileId);
    if (!isMember) throw new NotFoundException('방 참여자가 아닙니다.');

    // DB에서 참가자 제거 & 남은 인원 수 계산
    const { remaining } = await this.chatService.removeParticipant(roomId, profileId);

    // 소켓 룸에서 leave
    await this.chatGateway.leaveProfileFromRoom(profileId, roomId);

    // 남은 인원 수가 0이면 방/메시지 삭제
    if (remaining === 0) {
      const { roomDeleted, deletedMessageCount } =
        await this.chatService.deleteRoomAndMessages(roomId);

      return {
        message: '퇴장 완료(방 삭제)',
        roomId,
        remainingParticipants: 0,
        roomDeleted: roomDeleted, // true
        deleted: {
          room: roomDeleted,
          message: deletedMessageCount,
        },
      };
    }

    // 남아있으면 정상 퇴장만 응답
    return {
      message: '퇴장 완료',
      roomId,
      remainingParticipants: remaining,
      roomDeleted: false,
    };
  }
}
