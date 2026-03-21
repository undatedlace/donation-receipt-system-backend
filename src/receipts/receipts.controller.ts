import { Controller, Post, Get, Param, UseGuards, Res } from '@nestjs/common';
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
    private readonly receiptsService: ReceiptsService,
    private readonly donationsService: DonationsService,
  ) {}

  @Post('generate/:donationId')
  @ApiOperation({ summary: 'Generate a PDF receipt for a donation' })
  @ApiParam({ name: 'donationId', description: 'MongoDB ObjectId of the donation' })
  @ApiResponse({ status: 201, description: 'Returns { url, receiptNumber }' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generate(@Param('donationId') donationId: string) {
    const donation = await this.donationsService.findOne(donationId);
    const url      = await this.receiptsService.generatePdf(donation);
    await this.donationsService.updateReceiptUrl(donationId, url);
    return { url, receiptNumber: donation.receiptNumber };
  }

  @Get('download/:receiptNumber')
  @ApiOperation({ summary: 'Redirect to S3 PDF URL by receipt number' })
  @ApiParam({ name: 'receiptNumber', description: 'e.g. RCP-2026-0006' })
  @ApiResponse({ status: 302, description: 'Redirects to S3 PDF URL' })
  @ApiResponse({ status: 404, description: 'Receipt not generated yet' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async download(@Param('receiptNumber') receiptNumber: string, @Res() res: Response) {
    const donation = await this.donationsService.findByReceiptNumber(receiptNumber);
    if (!donation.receiptUrl)
      return res.status(404).json({
        message: 'Receipt not yet generated. Call POST /receipts/generate/:donationId first.',
      });
    return res.redirect(302, donation.receiptUrl);
  }
}