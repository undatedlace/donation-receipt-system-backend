import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { DonationType, PaymentMode } from './donation.schema';

export class CreateDonationDto {
  @IsString()
  @IsNotEmpty()
  fills: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  donorName: string;

  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsEnum(DonationType)
  donationType: DonationType;

  @IsEnum(PaymentMode)
  mode: PaymentMode;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  boxNumber?: number;

  @IsNumber()
  @Min(1)
  amount: number;
}

export class UpdateDonationDto {
  @IsOptional()
  @IsString()
  donorName?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsEnum(DonationType)
  donationType?: DonationType;
}