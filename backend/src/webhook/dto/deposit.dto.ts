import { IsEnum, IsString, IsNumberString } from 'class-validator';
import { Token } from '@prisma/client';

export class DepositDto {
  @IsString()
  idempotencyKey: string;

  @IsString()
  userId: string;

  @IsEnum(Token)
  token: Token;

  @IsNumberString()
  amount: string;
}