import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';

interface JoinRoomPayload {
  roomId: string;
}

interface SignalPayload {
  roomId: string;
  payload: unknown;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class LinkGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(LinkGateway.name);

  constructor(private readonly roomService: RoomService) {}

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomPayload): void {
    const roomId = payload?.roomId;
    if (!roomId) {
      client.emit('room-error', 'Некорректная ссылка на комнату.');
      return;
    }

    const room = this.roomService.getRoom(roomId);
    if (!room) {
      client.emit('room-error', 'Комната не найдена или устарела.');
      return;
    }

    const roomClients = this.server.sockets.adapter.rooms.get(roomId);
    if (roomClients && roomClients.size >= 2) {
      client.emit('room-full');
      return;
    }

    client.join(roomId);
    const updatedClients = this.server.sockets.adapter.rooms.get(roomId);
    const participantCount = updatedClients?.size ?? 0;
    const initiator = participantCount === 1;

    client.emit('joined', { roomId, initiator });
    if (initiator) {
      client.emit('waiting');
    } else {
      this.server.to(roomId).emit('ready');
    }
    this.logger.debug(`Socket ${client.id} joined room ${roomId}; participants=${participantCount}`);
  }

  @SubscribeMessage('signal')
  handleSignal(@ConnectedSocket() client: Socket, @MessageBody() payload: SignalPayload): void {
    const roomId = payload?.roomId;
    if (!roomId || typeof payload?.payload === 'undefined') {
      return;
    }
    client.to(roomId).emit('signal', { payload: payload.payload });
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomPayload): void {
    const roomId = payload?.roomId;
    if (!roomId) {
      return;
    }
    client.leave(roomId);
    client.to(roomId).emit('peer-left');
  }

  handleDisconnect(client: Socket): void {
    client.rooms.forEach((roomId) => {
      if (roomId !== client.id) {
        client.to(roomId).emit('peer-left');
      }
    });
    this.logger.debug(`Socket ${client.id} disconnected`);
  }
}
