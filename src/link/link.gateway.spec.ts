import { Test, TestingModule } from '@nestjs/testing';
import { LinkGateway } from './link.gateway';
import { RoomService } from './room.service';

describe('LinkGateway', () => {
  let gateway: LinkGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkGateway,
        {
          provide: RoomService,
          useValue: {
            getRoom: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<LinkGateway>(LinkGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
