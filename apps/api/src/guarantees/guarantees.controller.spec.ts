import { Test, TestingModule } from '@nestjs/testing';
import { GuaranteesController } from './guarantees.controller';

describe('GuaranteesController', () => {
  let controller: GuaranteesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuaranteesController],
    }).compile();

    controller = module.get<GuaranteesController>(GuaranteesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
