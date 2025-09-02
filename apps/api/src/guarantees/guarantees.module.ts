import { Module } from '@nestjs/common';
import { GuaranteesController } from './guarantees.controller';
import { GuaranteesService } from './guarantees.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GuaranteesController],
  providers: [GuaranteesService],
  exports: [GuaranteesService],
})
export class GuaranteesModule {}
