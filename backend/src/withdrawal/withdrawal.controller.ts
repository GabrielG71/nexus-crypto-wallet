import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalDto } from './dto/withdrawal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('withdrawal')
export class WithdrawalController {
  constructor(private withdrawalService: WithdrawalService) {}

  @Post()
  withdraw(@CurrentUser() user: { id: string }, @Body() dto: WithdrawalDto) {
    return this.withdrawalService.withdraw(user.id, dto);
  }
}