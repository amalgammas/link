import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface Room {
  id: string;
  createdAt: Date;
}

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);
  private readonly rooms = new Map<string, Room>();

  createRoom(): Room {
    const id = randomBytes(8).toString('hex');
    const room: Room = {
      id,
      createdAt: new Date(),
    };

    this.rooms.set(id, room);
    this.logger.debug(`Created room ${id}`);

    return room;
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }
}
