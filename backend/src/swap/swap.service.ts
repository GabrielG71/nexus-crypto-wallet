import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoinGeckoService } from './coingecko.service';
import { SwapDto } from './dto/swap.dto';
import { QuoteDto } from './dto/quote.dto';
import { Decimal } from 'decimal.js';
import { LedgerEntryType } from '@prisma/client';

const FEE_PERCENT = new Decimal('0.015'); // 1.5%

@Injectable()
export class SwapService {
  constructor(
    private prisma: PrismaService,
    private coinGecko: CoinGeckoService,
  ) {}

  async quote(dto: QuoteDto) {
    if (dto.fromToken === dto.toToken) {
      throw new BadRequestException('Cannot quote same token');
    }

    const amount = new Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('Amount must be positive');

    const rate = new Decimal(await this.coinGecko.getRate(dto.fromToken, dto.toToken));
    const fee = amount.mul(FEE_PERCENT);
    const amountAfterFee = amount.minus(fee);
    const toAmount = amountAfterFee.mul(rate);

    return {
      fromToken: dto.fromToken,
      toToken: dto.toToken,
      fromAmount: amount.toFixed(18),
      toAmount: toAmount.toFixed(18),
      fee: fee.toFixed(18),
      feePercent: '1.5',
      rate: rate.toFixed(18),
      cached: true,
    };
  }

  async swap(userId: string, dto: SwapDto) {
    if (dto.fromToken === dto.toToken) {
      throw new BadRequestException('Cannot swap same token');
    }

    const amount = new Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('Amount must be positive');

    const rate = new Decimal(await this.coinGecko.getRate(dto.fromToken, dto.toToken));
    const fee = amount.mul(FEE_PERCENT);
    const amountAfterFee = amount.minus(fee);
    const toAmount = amountAfterFee.mul(rate);

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { balances: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const fromBalance = wallet.balances.find((b) => b.token === dto.fromToken);
    const toBalance = wallet.balances.find((b) => b.token === dto.toToken);
    if (!fromBalance || !toBalance) throw new NotFoundException('Balance not found');

    const fromBefore = new Decimal(fromBalance.amount.toString());
    if (fromBefore.lt(amount)) throw new BadRequestException('Insufficient balance');

    const fromAfter = fromBefore.minus(amount);
    const toBefore = new Decimal(toBalance.amount.toString());
    const toAfter = toBefore.plus(toAmount);

    await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'SWAP',
          fromToken: dto.fromToken,
          toToken: dto.toToken,
          fromAmount: amount.toFixed(18),
          toAmount: toAmount.toFixed(18),
          feeAmount: fee.toFixed(18),
          rate: rate.toFixed(18),
        },
      });

      await tx.balance.update({ where: { id: fromBalance.id }, data: { amount: fromAfter.toFixed(18) } });
      await tx.balance.update({ where: { id: toBalance.id }, data: { amount: toAfter.toFixed(18) } });

      await tx.ledgerEntry.create({
        data: {
          balanceId: fromBalance.id,
          type: LedgerEntryType.SWAP_OUT,
          token: dto.fromToken,
          amount: amount.toFixed(18),
          balanceBefore: fromBefore.toFixed(18),
          balanceAfter: fromAfter.toFixed(18),
          transactionId: transaction.id,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          balanceId: fromBalance.id,
          type: LedgerEntryType.SWAP_FEE,
          token: dto.fromToken,
          amount: fee.toFixed(18),
          balanceBefore: fromBefore.toFixed(18),
          balanceAfter: fromAfter.toFixed(18),
          transactionId: transaction.id,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          balanceId: toBalance.id,
          type: LedgerEntryType.SWAP_IN,
          token: dto.toToken,
          amount: toAmount.toFixed(18),
          balanceBefore: toBefore.toFixed(18),
          balanceAfter: toAfter.toFixed(18),
          transactionId: transaction.id,
        },
      });
    });

    return {
      fromToken: dto.fromToken,
      toToken: dto.toToken,
      fromAmount: amount.toFixed(18),
      toAmount: toAmount.toFixed(18),
      fee: fee.toFixed(18),
      feePercent: '1.5',
      rate: rate.toFixed(18),
    };
  }
}