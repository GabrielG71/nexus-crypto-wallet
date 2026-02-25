import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SwapService } from './swap.service';
import { SwapDto } from './dto/swap.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('swap')
export class SwapController {
  constructor(private swapService: SwapService) {}

  @Post()
  swap(@CurrentUser() user: { id: string }, @Body() dto: SwapDto) {
    return this.swapService.swap(user.id, dto);
  }
}