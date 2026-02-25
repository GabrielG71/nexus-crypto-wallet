import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getBalances(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        balances: {
          orderBy: { token: 'asc' },
        },
      },
    });

    return {
      walletId: wallet.id,
      balances: wallet.balances.map((b) => ({
        token: b.token,
        amount: b.amount.toString(),
      })),
    };
  }
}