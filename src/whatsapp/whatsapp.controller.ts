import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsAppService } from './whatsapp.service';
import { DonationsService } from '../donations/donations.service';
import { ReceiptsService } from '../receipts/receipts.service';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly donationsService: DonationsService,
    private readonly receiptsService: ReceiptsService,
    private readonly config: ConfigService,
  ) {}

  // ─── GET /whatsapp/status ────────────────────────────────────────────────────
  @Get('status')
  @ApiOperation({ summary: 'Check Meta WhatsApp Cloud API connection status' })
  @ApiResponse({ status: 200, description: 'Returns provider info and configured phone number ID' })
  getStatus() {
    return {
      connected: true,
      provider: 'Meta Cloud API',
      phoneNumberId: this.config.get<string>('PHONE_NUMBER_ID'),
    };
  }

  // ─── POST /whatsapp/send/:donationId ────────────────────────────────────────
  @Post('send/:donationId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate (if needed) and send receipt PDF via Meta WhatsApp' })
  @ApiParam({ name: 'donationId', description: 'MongoDB ObjectId of the donation' })
  @ApiResponse({ status: 200, description: '{ success, receiptUrl, whatsappSent, recipientNumber }' })
  async sendReceipt(@Param('donationId') donationId: string) {
    // 1. Fetch donation
    const donation = await this.donationsService.findOne(donationId);

    if (!donation.receiptNumber) {
      throw new BadRequestException(
        'Receipt not generated yet. Call POST /receipts/generate/:id first.',
      );
    }

    // 2. Resolve receipt URL — generate PDF if not already stored
    let receiptUrl: string = donation.receiptUrl;
    if (!receiptUrl) {
      this.logger.log(`No receipt URL for donation ${donationId} — generating now`);
      receiptUrl = await this.receiptsService.generatePdf(donation);
      await this.donationsService.updateReceiptUrl(donationId, receiptUrl);
    }

    // 3. Send via Meta WhatsApp Cloud API
    const result = await this.whatsappService.sendReceiptPdf(
      donation.mobileNumber,
      receiptUrl,
      donation.donorName,
      donation.receiptNumber,
      donation.amount,
    );

    if (!result.success) {
      return { success: false, receiptUrl, whatsappSent: false, error: result.error };
    }

    // 4. Mark donation as WhatsApp sent
    await this.donationsService.markWhatsAppSent(donationId);

    return {
      success: true,
      receiptUrl,
      whatsappSent: true,
      recipientNumber: result.recipientNumber,
    };
  }

  // ─── GET /whatsapp/test/:mobileNumber ───────────────────────────────────────
  @Get('test/:mobileNumber')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send a test text message to verify Meta API connection' })
  @ApiParam({ name: 'mobileNumber', description: 'Mobile number to test (e.g. 9876543210)' })
  @ApiResponse({ status: 200, description: '{ success, messageId } or { success: false, error }' })
  async testConnection(@Param('mobileNumber') mobileNumber: string) {
    return this.whatsappService.sendTestMessage(mobileNumber);
  }
}