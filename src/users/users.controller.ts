import { Controller, Post, Patch, Delete, Get, Body, Param, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateSelfDto } from './dto/update-self.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiResponse({ status: 200, description: 'Array of users (password omitted)' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user (password omitted)' })
  async getMe(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('me')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Update current authenticated user profile (email, name, password)' })
  @ApiResponse({ status: 200, description: 'Updated user (password omitted)' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateMe(@Request() req, @Body() dto: UpdateSelfDto) {
    return this.usersService.updateSelf(req.user.userId, dto);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Register a new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async create(@Body() dto: RegisterDto) {
    const user = await this.usersService.create(
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.password,
      dto.roles ?? ['user'],
      dto.zone,
      dto.branch,
      dto.phone,
    );
    const { password: _, ...result } = (user as any).toObject();
    return result;
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a user (admin only)' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the user' })
  @ApiResponse({ status: 200, description: 'Updated user (password omitted)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string) {
    await this.usersService.delete(id);
  }
}
