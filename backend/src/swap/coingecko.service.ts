import { Injectable, BadRequestException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Token } from '@prisma/client';

const CACHE_TTL = 60; // 60 segundos

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BRL: 'brl',
};

@Injectable()
export class CoinGeckoService {
  constructor(private redis: RedisService) {}

  async getRate(fromToken: Token, toToken: Token): Promise<string> {
    const cacheKey = `rate:${fromToken}:${toToken}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const rate = await this.fetchRate(fromToken, toToken);
    await this.redis.set(cacheKey, rate, CACHE_TTL);
    return rate;
  }

  private async fetchRate(fromToken: Token, toToken: Token): Promise<string> {
    try {
      // Estratégia: converter tudo para USD como intermediário
      const fromUsd = await this.getPriceInUsd(fromToken);
      const toUsd = await this.getPriceInUsd(toToken);

      const { Decimal } = await import('decimal.js');
      const rate = new Decimal(fromUsd).div(new Decimal(toUsd));
      return rate.toFixed(18);
    } catch {
      throw new BadRequestException('Failed to fetch exchange rate from CoinGecko');
    }
  }

  private async getPriceInUsd(token: Token): Promise<string> {
    // BRL: busca cotação USD/BRL
    if (token === 'BRL') {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=brl',
      );
      const data = await res.json();
      const usdInBrl = data?.usd?.brl;
      if (!usdInBrl) throw new Error('Failed to fetch BRL rate');
      // 1 BRL = 1/usdInBrl USD
      const { Decimal } = await import('decimal.js');
      return new Decimal(1).div(usdInBrl).toFixed(18);
    }

    const id = COINGECKO_IDS[token];
    if (!id) throw new Error(`Unknown token: ${token}`);

    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
    );
    const data = await res.json();
    const price = data?.[id]?.usd;
    if (!price) throw new Error(`Failed to fetch price for ${token}`);
    return String(price);
  }
}