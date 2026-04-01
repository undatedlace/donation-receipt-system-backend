import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john@example.com', description: 'Unique user email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Password for the account' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: ['user'], description: 'Optional list of role names (admin | user)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(['admin', 'user'], { each: true })
  roles?: string[];

  @ApiPropertyOptional({ example: '9876543210', description: 'WhatsApp phone number of the user' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Zone A', description: 'Zone' })
  @IsOptional()
  @IsString()
  zone?: string;

  @ApiPropertyOptional({ example: 'Mira Road Branch', description: 'Branch' })
  @IsOptional()
  @IsString()
  branch?: string;
}
