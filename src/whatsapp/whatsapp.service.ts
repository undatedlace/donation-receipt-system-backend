import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(private config: ConfigService) {
    this.token = this.config.get('WHATSAPP_ACCESS_TOKEN') || '';
    this.phoneNumberId = this.config.get('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.apiUrl = `https://graph.facebook.com/v19.0/${this.phoneNumberId}`;
  }

  // ─── Send greeting text message ─────────────────────────────────────────────
  private async sendTextMessage(to: string, text: string): Promise<void> {
    await axios.post(
      `${this.apiUrl}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  // ─── Send PDF via Cloudinary URL (link = hosted on Cloudinary) ──────────────
  private async sendDocumentByUrl(
    to: string,
    pdfUrl: string,
    filename: string,
    caption: string,
  ): Promise<void> {
    await axios.post(
      `${this.apiUrl}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: {
          link: pdfUrl,      // Meta fetches the PDF directly from Cloudinary URL
          filename,
          caption,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  // ─── Main: send receipt to donor's WhatsApp ──────────────────────────────────
  // receiptUrl is the Cloudinary URL stored in DB (e.g. https://res.cloudinary.com/...)
  async sendReceiptPdf(
    mobileNumber: string,
    receiptUrl: string,           // Cloudinary URL — no file path needed
    donorName: string,
    receiptNumber: string,
    amount: number,
    donationType: string,
  ): Promise<void> {
    const to = this.normalizeNumber(mobileNumber);

    try {
      // 1. Send Islamic greeting text
      const greeting =
        `Assalamu Alaikum wa Rahmatullahi wa Barakatuh 🌙\n\n` +
        `Dear *${donorName}*,\n\n` +
        `JazakAllah Khair for your generous *${donationType}* donation of *₹${Number(amount).toLocaleString('en-IN')}*.\n\n` +
        `Please find your official receipt attached below.\n\n` +
        `🤲 May Allah accept your Sadaqah and bless you abundantly.\n\n` +
        `— Noori Donation Centre`;

      await this.sendTextMessage(to, greeting);

      // 2. Send PDF document using Cloudinary URL directly
      await this.sendDocumentByUrl(
        to,
        receiptUrl,
        `${receiptNumber}.pdf`,
        `Official Receipt — ${receiptNumber}`,
      );

      this.logger.log(`✅ Receipt ${receiptNumber} sent to ${to} via Cloudinary URL`);
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to send WhatsApp to ${to}: ${msg}`);
      throw new InternalServerErrorException(`WhatsApp send failed: ${msg}`);
    }
  }

  // ─── Normalize to E.164 without leading + (Meta API format) ─────────────────
  private normalizeNumber(mobile: string): string {
    let num = mobile.replace(/[\s\-\(\)]/g, '');
    if (num.startsWith('+')) return num.replace('+', '');
    num = num.replace(/^0/, '');
    if (num.length === 10) return `91${num}`; // default India +91
    return num;
  }
}