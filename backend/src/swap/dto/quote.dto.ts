import { IsEnum, IsNumberString } from 'class-validator';
import { Token } from '@prisma/client';

export class QuoteDto {
  @IsEnum(Token)
  fromToken: Token;

  @IsEnum(Token)
  toToken: Token;

  @IsNumberString()
  amount: string;
}