import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@ApiBearerAuth()
@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics (totals, counts, breakdowns)' })
  @ApiResponse({ status: 200, description: 'Returns dashboard stats' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getDashboard(@Request() req) {
    return this.statsService.getDashboardStats(req.user.userId, req.user.roles ?? []);
  }
}