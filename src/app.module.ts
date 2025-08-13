import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import { UserModule } from './user/user.module';
import { AuthModule } from './user/auth/auth.module';
import { User } from './user/user.entity';
import configuration from './user/config/configuration';
import validationSchema from './user/config/validation-schema';

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
      useFactory: (config: ConfigService): RedisModuleOptions => {
        const host = config.get<string>('redis.host', 'localhost');
        const port = config.get<number>('redis.port', 6379);
        return {
          type: 'single',
          options: { host, port },
        };
      },
    }),

    UserModule,
    AuthModule,
  ],
})
export class AppModule {}
