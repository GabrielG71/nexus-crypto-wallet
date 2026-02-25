import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DepositDto } from './dto/deposit.dto';
import { Decimal } from 'decimal.js';
import { LedgerEntryType } from '@prisma/client';

@Injectable()
export class WebhookService {
  constructor(private prisma: PrismaService) {}

  async deposit(dto: DepositDto) {
    const amount = new Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('Amount must be positive');

    // Checar idempotência
    const existing = await this.prisma.depositIdempotency.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) throw new ConflictException('Deposit already processed');

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: dto.userId },
      include: { balances: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const balance = wallet.balances.find((b) => b.token === dto.token);
    if (!balance) throw new NotFoundException('Balance not found for token');

    const balanceBefore = new Decimal(balance.amount.toString());
    const balanceAfter = balanceBefore.plus(amount);

    await this.prisma.$transaction(async (tx) => {
      // Registrar idempotência
      await tx.depositIdempotency.create({
        data: {
          idempotencyKey: dto.idempotencyKey,
          userId: dto.userId,
          token: dto.token,
          amount: amount.toFixed(18),
        },
      });

      // Criar transação
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          toToken: dto.token,
          toAmount: amount.toFixed(18),
        },
      });

      // Atualizar saldo
      await tx.balance.update({
        where: { id: balance.id },
        data: { amount: balanceAfter.toFixed(18) },
      });

      // Criar ledger entry
      await tx.ledgerEntry.create({
        data: {
          balanceId: balance.id,
          type: LedgerEntryType.DEPOSIT,
          token: dto.token,
          amount: amount.toFixed(18),
          balanceBefore: balanceBefore.toFixed(18),
          balanceAfter: balanceAfter.toFixed(18),
          transactionId: transaction.id,
        },
      });
    });

    return { message: 'Deposit processed successfully', balanceAfter: balanceAfter.toFixed(18) };
  }
}