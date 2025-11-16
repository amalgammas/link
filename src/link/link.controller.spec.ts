import { Test, TestingModule } from '@nestjs/testing';
import { LinkController } from './link.controller';
import { RoomService } from './room.service';

describe('LinkController', () => {
  let controller: LinkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinkController],
      providers: [
        {
          provide: RoomService,
          useValue: {
            getRoom: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LinkController>(LinkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
