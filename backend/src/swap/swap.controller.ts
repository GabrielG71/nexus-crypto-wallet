import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { SwapService } from './swap.service';
import { SwapDto } from './dto/swap.dto';
import { QuoteDto } from './dto/quote.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('swap')
export class SwapController {
  constructor(private swapService: SwapService) {}

  @Get('quote')
  quote(@Query() query: QuoteDto) {
    return this.swapService.quote(query);
  }

  @Post()
  swap(@CurrentUser() user: { id: string }, @Body() dto: SwapDto) {
    return this.swapService.swap(user.id, dto);
  }
}