import { Controller, Post, Param, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsAppService } from './whatsapp.service';
import { DonationsService } from '../donations/donations.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  constructor(
    private whatsappService: WhatsAppService,
    private donationsService: DonationsService,
  ) {}

  @Post('send/:donationId')
  async sendReceipt(@Param('donationId') donationId: string) {
    const donation = await this.donationsService.findOne(donationId);

    if (!donation.receiptNumber) {
      throw new BadRequestException('Receipt not generated yet. Call POST /receipts/generate/:id first.');
    }

    if (!donation.receiptUrl) {
      throw new BadRequestException('Receipt URL missing. Regenerate the receipt first.');
    }

    // Pass the Cloudinary URL directly — no local file needed
    await this.whatsappService.sendReceiptPdf(
      donation.mobileNumber,
      donation.receiptUrl,         // Cloudinary URL from DB
      donation.donorName,
      donation.receiptNumber,
      donation.amount,
      donation.donationType,
    );

    await this.donationsService.markWhatsAppSent(donationId);

    return {
      success: true,
      message: `Receipt ${donation.receiptNumber} sent to ${donation.mobileNumber}`,
    };
  }
}