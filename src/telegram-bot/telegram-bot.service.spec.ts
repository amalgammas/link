import { Test, TestingModule } from '@nestjs/testing';
import { TelegramBotService } from './telegram-bot.service';
import { RoomService } from '../link/room.service';

describe('TelegramBotService', () => {
  let service: TelegramBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotService,
        {
          provide: RoomService,
          useValue: {
            createRoom: jest.fn(),
            getRoom: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramBotService>(TelegramBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
