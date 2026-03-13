import { Controller, Post, Get, Param, UseGuards, Res, Redirect } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReceiptsService } from './receipts.service';
import { DonationsService } from '../donations/donations.service';

@ApiTags('Receipts')
@ApiBearerAuth()
@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(
    private receiptsService: ReceiptsService,
    private donationsService: DonationsService,
  ) {}

  @Post('generate/:donationId')
  @ApiOperation({ summary: 'Generate a PDF receipt for a donation' })
  @ApiParam({ name: 'donationId', description: 'MongoDB ObjectId of the donation' })
  @ApiResponse({ status: 201, description: 'Receipt generated, returns URL and receipt number' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generate(@Param('donationId') donationId: string) {
    const donation = await this.donationsService.findOne(donationId);
    const url = await this.receiptsService.generatePdf(donation);
    await this.donationsService.updateReceiptUrl(donationId, url);
    return { url, receiptNumber: donation.receiptNumber };
  }

  @Get('download/:receiptNumber')
  @ApiOperation({ summary: 'Redirect to the S3 PDF receipt URL by receipt number' })
  @ApiParam({ name: 'receiptNumber', description: 'Receipt number (e.g. RCP-2025-0001)' })
  @ApiResponse({ status: 302, description: 'Redirects to the S3 PDF URL' })
  @ApiResponse({ status: 404, description: 'Receipt not found or not yet generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async download(@Param('receiptNumber') receiptNumber: string, @Res() res: Response) {
    const donation = await this.donationsService.findByReceiptNumber(receiptNumber);
    if (!donation.receiptUrl) {
      return res.status(404).json({ message: 'Receipt not yet generated. Call POST /receipts/generate/:donationId first.' });
    }
    return res.redirect(302, donation.receiptUrl);
  }
}