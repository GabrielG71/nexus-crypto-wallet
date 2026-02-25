import { Module } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';

@Module({
  providers: [WithdrawalService],
  controllers: [WithdrawalController],
})
export class WithdrawalModule {}