import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { UserModule } from './user/user.module';
import { AuthModule } from './user/auth/auth.module';
import { User } from './user/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import validationSchema from './config/validation-schema';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: '.env',
    }),

    // MySQL 연결
    // TypeORM 설정: 환경변수 기반
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('database.host'),
        port: config.get<number>('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        entities: [User],
        synchronize: false,
      }),
    }),

    // Redis 연결
    // Redis 설정: 환경변수 기반
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        options: {
          host: config.get('redis.host'),
          port: config.get<number>('redis.port'),
        },
      }),
    }),

    // mongob 연결
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongo.uri'),
        dbName: configService.get<string>('mongo.dbName'),
      }),
      inject: [ConfigService],
    }),

    ChatModule,
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}
