import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, Request, Res, Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './donation.dto';

@ApiTags('Donations')
@ApiBearerAuth()
@Controller('donations')
@UseGuards(JwtAuthGuard)
export class DonationsController {
  constructor(private donationsService: DonationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new donation' })
  @ApiBody({ type: CreateDonationDto })
  @ApiResponse({ status: 201, description: 'Donation created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateDonationDto, @Request() req) {
    return this.donationsService.create(dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all donations with optional filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'donorName', required: false, type: String, description: 'Filter by donor name' })
  @ApiQuery({ name: 'donationType', required: false, type: String, description: 'Filter by donation type' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of donations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: any) {
    return this.donationsService.findAll(query);
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=donations.csv')
  @ApiOperation({ summary: 'Export all donations as a CSV file' })
  @ApiResponse({ status: 200, description: 'Returns a CSV file of all donations', content: { 'text/csv': {} } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportCsv(@Res() res: Response) {
    const records = await this.donationsService.exportAll();
    const headers = [
      'Receipt No', 'Date', 'Donor Name', 'Mobile', 'Address',
      'Donation Type', 'Mode', 'Box No', 'Amount', 'WhatsApp Sent',
    ];
    const rows = records.map((d) => [
      d.receiptNumber, new Date(d.date).toLocaleDateString(), d.donorName,
      d.mobileNumber, d.address, d.donationType, d.mode,
      d.boxNumber || '', d.amount, d.whatsappSent ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    res.send(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a donation by ID' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the donation' })
  @ApiResponse({ status: 200, description: 'Returns the donation' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string) {
    return this.donationsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a donation by ID' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the donation' })
  @ApiResponse({ status: 200, description: 'Donation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  delete(@Param('id') id: string) {
    return this.donationsService.delete(id);
  }
}