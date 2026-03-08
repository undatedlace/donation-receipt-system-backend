import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Unique user email',
  })
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Password for the account',
  })
  password: string;

  @ApiProperty({
    example: ['user'],
    required: false,
    description: 'Optional list of role names',
    type: [String],
  })
  roles?: string[];
}
