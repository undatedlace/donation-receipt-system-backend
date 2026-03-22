import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DonationType, PaymentMode } from './donation.schema';

export class CreateDonationDto {
  @ApiProperty({ example: 'John Doe', description: 'Filled by / prepared by' })
  @IsString()
  @IsNotEmpty()
  fills: string;

  @ApiProperty({ example: '2026-03-08', description: 'Donation date (ISO 8601)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Ahmed Ali', description: 'Full name of the donor' })
  @IsString()
  @IsNotEmpty()
  donorName: string;

  @ApiProperty({ example: '+919876543210', description: 'Mobile number of the donor' })
  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @ApiProperty({ example: '123 Main St, City', description: 'Address of the donor' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ enum: DonationType, example: DonationType.ZAKAT, description: 'Type of donation' })
  @IsEnum(DonationType)
  donationType: DonationType;

  @ApiProperty({ enum: PaymentMode, example: PaymentMode.CASH, description: 'Payment mode' })
  @IsEnum(PaymentMode)
  mode: PaymentMode;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 100, description: 'Box number (for Noori Box donations)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  boxNumber?: number;

  @ApiProperty({ example: 500, minimum: 1, description: 'Donation amount' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'https://s3.../qr.jpg', description: 'QR screenshot URL (auto-populated)' })
  @IsOptional()
  @IsString()
  qrImageUrl?: string;

  @ApiPropertyOptional({ example: 'Zone A', description: 'Zone of the donor' })
  @IsOptional()
  @IsString()
  zone?: string;

  @ApiPropertyOptional({ example: 'Mira Road Branch', description: 'Branch of the donor' })
  @IsOptional()
  @IsString()
  branch?: string;
}

export class UpdateDonationDto {
  @ApiPropertyOptional({ example: 'Ahmed Ali', description: 'Updated donor name' })
  @IsOptional()
  @IsString()
  donorName?: string;

  @ApiPropertyOptional({ example: 1000, description: 'Updated amount' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ enum: DonationType, description: 'Updated donation type' })
  @IsOptional()
  @IsEnum(DonationType)
  donationType?: DonationType;
}