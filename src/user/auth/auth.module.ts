import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule as _JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserService } from '../user.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

@Module({
  imports: [
    PassportModule,
    // 환경변수 기반 JWT 설정
    _JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    // TypeORM 유저 엔티티
    TypeOrmModule.forFeature([User]),

    // 환경변수 기반 Redis 설정
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: `redis://${config.get('redis.host')}:${config.get('redis.port')}`,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
