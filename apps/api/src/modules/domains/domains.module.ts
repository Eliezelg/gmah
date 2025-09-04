import { Module } from '@nestjs/common';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';

@Module({
  imports: [],
  controllers: [DomainsController],
  providers: [DomainsService],
  exports: [DomainsService]
})
export class DomainsModule {}