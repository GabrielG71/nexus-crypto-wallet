import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Token } from '@prisma/client';
import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class LedgerQueryDto {
  @IsOptional()
  @IsEnum(Token)
  token?: Token;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

@UseGuards(JwtAuthGuard)
@Controller('ledger')
export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Get()
  getStatement(
    @CurrentUser() user: { id: string },
    @Query() query: LedgerQueryDto,
  ) {
    return this.ledgerService.getStatement(user.id, query.token, query.page, query.limit);
  }
}