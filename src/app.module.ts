import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
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
      useFactory: (config: ConfigService): RedisModuleOptions => {
        const host = config.get<string>('redis.host', 'localhost');
        const port = config.get<number>('redis.port', 6379);
        return {
          type: 'single',
          options: { host, port },
        };
      },
    }),

    // mongob 연결
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('mongo.uri');
        const dbName = config.get<string>('mongo.dbName') || 'project';
        if (!uri) throw new Error('mongo.uri is missing from config');

        return {
          uri,
          dbName,
          serverSelectionTimeoutMS: 8000,
          autoCreate: true,
          autoIndex: true,
          connectionFactory: (connection) => {
            const logger = new Logger('Mongoose'); // 연결
            connection.on('connected', () =>
              logger.log(`Connected to ${connection.name} db="${connection.db.databaseName}"`),
            ); // DB명
            connection.on('error', (e: unknown) => {
              const msg = e instanceof Error ? e.message : String(e);
              logger.error(msg);
            });
            connection.on('disconnected', () => logger.warn('Disconnected'));
            return connection;
          },
        };
      },
    }),

    ChatModule, // ChatModule을 imports
    UserModule, // UserModule을 imports
    AuthModule, // AuthModule을 imports
  ],
})
export class AppModule {}
