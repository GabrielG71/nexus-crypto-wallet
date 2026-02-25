import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WithdrawalDto } from './dto/withdrawal.dto';
import { Decimal } from 'decimal.js';
import { LedgerEntryType } from '@prisma/client';

@Injectable()
export class WithdrawalService {
  constructor(private prisma: PrismaService) {}

  async withdraw(userId: string, dto: WithdrawalDto) {
    const amount = new Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('Amount must be positive');

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { balances: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const balance = wallet.balances.find((b) => b.token === dto.token);
    if (!balance) throw new NotFoundException('Balance not found');

    const balanceBefore = new Decimal(balance.amount.toString());
    if (balanceBefore.lt(amount)) throw new BadRequestException('Insufficient balance');

    const balanceAfter = balanceBefore.minus(amount);

    await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          fromToken: dto.token,
          fromAmount: amount.toFixed(18),
        },
      });

      await tx.balance.update({
        where: { id: balance.id },
        data: { amount: balanceAfter.toFixed(18) },
      });

      await tx.ledgerEntry.create({
        data: {
          balanceId: balance.id,
          type: LedgerEntryType.WITHDRAWAL,
          token: dto.token,
          amount: amount.toFixed(18),
          balanceBefore: balanceBefore.toFixed(18),
          balanceAfter: balanceAfter.toFixed(18),
          transactionId: transaction.id,
        },
      });
    });

    return {
      message: 'Withdrawal processed successfully',
      token: dto.token,
      amount: amount.toFixed(18),
      destination: dto.destination,
      balanceAfter: balanceAfter.toFixed(18),
    };
  }
}