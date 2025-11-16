import { Test, TestingModule } from '@nestjs/testing';
import { LinkGateway } from './link.gateway';

describe('LinkGateway', () => {
  let gateway: LinkGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkGateway],
    }).compile();

    gateway = module.get<LinkGateway>(LinkGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
