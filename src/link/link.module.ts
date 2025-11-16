import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { LinkController } from './link.controller';
import { LinkGateway } from './link.gateway';

@Module({
  providers: [RoomService, LinkGateway],
  controllers: [LinkController],
  exports: [RoomService],
})
export class LinkModule {}
