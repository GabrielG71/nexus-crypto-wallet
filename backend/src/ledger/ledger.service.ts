import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Token } from '@prisma/client';

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  async getStatement(userId: string, token?: Token, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const balanceWhere = token
      ? { walletId: wallet.id, token }
      : { walletId: wallet.id };

    const balances = await this.prisma.balance.findMany({ where: balanceWhere });
    const balanceIds = balances.map((b) => b.id);

    const [entries, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: { balanceId: { in: balanceIds } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { transaction: { select: { type: true } } },
      }),
      this.prisma.ledgerEntry.count({
        where: { balanceId: { in: balanceIds } },
      }),
    ]);

    return {
      data: entries.map((e) => ({
        id: e.id,
        type: e.type,
        token: e.token,
        amount: e.amount.toString(),
        balanceBefore: e.balanceBefore.toString(),
        balanceAfter: e.balanceAfter.toString(),
        transactionType: e.transaction?.type,
        createdAt: e.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}