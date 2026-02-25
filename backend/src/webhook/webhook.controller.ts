import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { DepositDto } from './dto/deposit.dto';
import { ConfigService } from '@nestjs/config';

@Controller('webhook')
export class WebhookController {
  constructor(
    private webhookService: WebhookService,
    private config: ConfigService,
  ) {}

  @Post('deposit')
  deposit(
    @Body() dto: DepositDto,
    @Headers('x-webhook-secret') secret: string,
  ) {
    // Validação simples de secret para o webhook
    const expected = this.config.get('WEBHOOK_SECRET');
    if (expected && secret !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
    return this.webhookService.deposit(dto);
  }
}