import { IsEnum, IsNumberString, IsString } from 'class-validator';
import { Token } from '@prisma/client';

export class WithdrawalDto {
  @IsEnum(Token)
  token: Token;

  @IsNumberString()
  amount: string;

  @IsString()
  destination: string;
}