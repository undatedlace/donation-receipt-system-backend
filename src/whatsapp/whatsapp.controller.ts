import { Controller, Get, Post, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsAppService } from './whatsapp.service';
import { DonationsService } from '../donations/donations.service';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  constructor(
    private whatsappService: WhatsAppService,
    private donationsService: DonationsService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Twilio WhatsApp connection status' })
  @ApiResponse({ status: 200, description: 'Always connected when credentials are set' })
  getStatus() {
    return { connected: true, provider: 'Twilio' };
  }

  @Post('send/:donationId')
  @ApiOperation({ summary: 'Send receipt PDF to donor via Twilio WhatsApp' })
  @ApiParam({ name: 'donationId', description: 'MongoDB ObjectId of the donation' })
  @ApiResponse({ status: 200, description: 'Returns { success, message } or { success: false, error }' })
  async sendReceipt(@Param('donationId') donationId: string) {
    const donation = await this.donationsService.findOne(donationId);

    if (!donation.receiptNumber) {
      throw new BadRequestException('Receipt not generated yet. Call POST /receipts/generate/:id first.');
    }

    if (!donation.receiptUrl) {
      throw new BadRequestException('Receipt URL missing. Regenerate the receipt first.');
    }

    const result = await this.whatsappService.sendReceiptPdf(
      donation.mobileNumber,
      donation.receiptUrl,
      donation.donorName,
      donation.receiptNumber,
      donation.amount,
      donation.donationType,
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    await this.donationsService.markWhatsAppSent(donationId);

    return {
      success: true,
      message: `Receipt ${donation.receiptNumber} sent to ${donation.mobileNumber} via WhatsApp`,
    };
  }
}