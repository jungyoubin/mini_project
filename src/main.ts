import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 전역 ValidationPipe 설정
  app.useGlobalPipes(new ValidationPipe());

  // ConfigService 가져오기
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3000;

  mongoose.set('debug', true); // mongodb의 내장 디버거를 사용할 수 있다. 실행된 모든 mongodb 작업 콘솔 기록

  await app.listen(port);
}

bootstrap();
