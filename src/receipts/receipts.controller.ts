import { Controller, Post, Get, Param, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReceiptsService } from './receipts.service';
import { DonationsService } from '../donations/donations.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(
    private receiptsService: ReceiptsService,
    private donationsService: DonationsService,
  ) {}

  @Post('generate/:donationId')
  async generate(@Param('donationId') donationId: string) {
    const donation = await this.donationsService.findOne(donationId);
    const url = await this.receiptsService.generatePdf(donation);
    await this.donationsService.updateReceiptUrl(donationId, url);
    return { url, receiptNumber: donation.receiptNumber };
  }

  @Get('download/:receiptNumber')
  async download(@Param('receiptNumber') receiptNumber: string, @Res() res: Response) {
    const filepath = path.join(process.cwd(), 'receipts', `${receiptNumber}.pdf`);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: 'Receipt not found. Generate it first.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receiptNumber}.pdf"`);
    fs.createReadStream(filepath).pipe(res);
  }
}