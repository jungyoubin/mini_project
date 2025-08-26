import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { Board, BoardSchema } from './schemas/board.schema';
import { AuthModule } from '../common/auth/auth.module';
import { HttpJwtGuard } from '../guards/jwt.guard';

@Module({
  imports: [MongooseModule.forFeature([{ name: Board.name, schema: BoardSchema }]), AuthModule],
  controllers: [BoardController],
  providers: [BoardService, HttpJwtGuard],
  exports: [BoardService],
})
export class BoardModule {}
