import { Injectable } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
@Injectable()
export class ChatService {
  constructor(private readonly gateway: ChatGateway) {}
}
