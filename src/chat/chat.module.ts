import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): RedisModuleOptions => {
        const host = config.get<string>('redis.host', 'localhost');
        const port = config.get<number>('redis.port', 6379);
        return {
          type: 'single',
          options: {
            host,
            port,
          },
        };
      },
    }),
  ],
  providers: [ChatGateway, ChatService, WsJwtGuard],
  exports: [ChatGateway, ChatService],
})
export class ChatModule {}
