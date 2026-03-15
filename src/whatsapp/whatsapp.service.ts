import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: ReturnType<typeof twilio>;
  private readonly from: string;

  constructor(private config: ConfigService) {
    const accountSid = this.config.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const authToken  = this.config.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    this.from        = this.config.getOrThrow<string>('TWILIO_WHATSAPP_NUMBER'); // e.g. whatsapp:+14155238886
    this.client      = twilio(accountSid, authToken);
  }

  // ─── Main: send receipt to donor's WhatsApp ─────────────────────────────────
  async sendReceiptPdf(
    mobileNumber: string,
    receiptUrl: string,     // Public S3 / Render URL
    donorName: string,
    receiptNumber: string,
    amount: number,
    donationType: string,
  ): Promise<{ success: boolean; error?: string }> {
    const to = this.toWhatsApp(mobileNumber);

    try {
      const greeting =
        `Assalamu Alaikum wa Rahmatullahi wa Barakatuh 🌙\n\n` +
        `Dear *${donorName}*,\n\n` +
        `JazakAllah Khair for your generous *${donationType}* donation of *₹${Number(amount).toLocaleString('en-IN')}*.\n\n` +
        `SDI Education Centre is grateful for your contribution. 🤲\n\n` +
        `Your official receipt is attached below.\n\n` +
        `May Allah accept your Sadaqah and bless you and your family abundantly.\n\n` +
        `— SDI Education Centre`;

      // 1. Greeting text message
      await this.client.messages.create({
        from: this.from,
        to,
        body: greeting,
      });

      // 2. PDF as media message
      await this.client.messages.create({
        from: this.from,
        to,
        body: `📄 Receipt *${receiptNumber}*`,
        mediaUrl: [receiptUrl],
      });

      this.logger.log(`✅ Receipt ${receiptNumber} sent to ${to} via Twilio`);
      return { success: true };
    } catch (error: any) {
      const msg: string = error?.message ?? 'Unknown Twilio error';
      this.logger.error(`Failed to send WhatsApp to ${to}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  // ─── Normalize to Twilio WhatsApp format: whatsapp:+91XXXXXXXXXX ─────────────
  private toWhatsApp(mobile: string): string {
    let num = mobile.replace(/[\s\-\(\)]/g, '');
    if (num.startsWith('whatsapp:')) return num;
    if (num.startsWith('+')) return `whatsapp:${num}`;
    num = num.replace(/^0/, '');
    if (num.length === 10) num = `91${num}`;  // default India +91
    return `whatsapp:+${num}`;
  }
}