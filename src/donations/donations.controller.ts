import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, Request, Res, Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './donation.dto';

@Controller('donations')
@UseGuards(JwtAuthGuard)
export class DonationsController {
  constructor(private donationsService: DonationsService) {}

  @Post()
  create(@Body() dto: CreateDonationDto, @Request() req) {
    return this.donationsService.create(dto, req.user.userId);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.donationsService.findAll(query);
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=donations.csv')
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
  findOne(@Param('id') id: string) {
    return this.donationsService.findOne(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.donationsService.delete(id);
  }
}