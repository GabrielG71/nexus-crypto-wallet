import { Module } from '@nestjs/common';
import { SwapService } from './swap.service';
import { SwapController } from './swap.controller';

@Module({
  providers: [SwapService],
  controllers: [SwapController],
})
export class SwapModule {}