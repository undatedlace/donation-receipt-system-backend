import { Controller, Get, Post, Param, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsAppService } from './whatsapp.service';
import { DonationsService } from '../donations/donations.service';
import * as QRCode from 'qrcode';
import * as path from 'path';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  constructor(
    private whatsappService: WhatsAppService,
    private donationsService: DonationsService,
  ) {}

  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Get('qr')
  async getQrCode(@Res() res: Response) {
    const qr = this.whatsappService.getQr();
    if (!qr) {
      return res.json({ message: 'No QR available. Client may already be connected.' });
    }
    // Return as base64 PNG image
    const qrImage = await QRCode.toDataURL(qr);
    return res.json({ qr: qrImage });
  }

  @Post('send/:donationId')
  async sendReceipt(@Param('donationId') donationId: string) {
    const donation = await this.donationsService.findOne(donationId);

    if (!donation.receiptNumber) {
      throw new Error('Receipt not generated yet. Generate receipt first.');
    }

    const pdfPath = path.join(process.cwd(), 'receipts', `${donation.receiptNumber}.pdf`);

    await this.whatsappService.sendPdf(
      donation.mobileNumber,
      pdfPath,
      donation.donorName,
      donation.receiptNumber,
    );

    await this.donationsService.markWhatsAppSent(donationId);

    return { success: true, message: `Receipt sent to ${donation.mobileNumber}` };
  }
}