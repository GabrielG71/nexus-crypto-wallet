import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';

@Module({
  providers: [LedgerService],
  controllers: [LedgerController],
})
export class LedgerModule {}