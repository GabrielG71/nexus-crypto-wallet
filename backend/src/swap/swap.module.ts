import { Module } from '@nestjs/common';
import { SwapService } from './swap.service';
import { SwapController } from './swap.controller';
import { CoinGeckoService } from './coingecko.service';

@Module({
  providers: [SwapService, CoinGeckoService],
  controllers: [SwapController],
})
export class SwapModule {}