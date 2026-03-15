// ─── ACTIVE PROVIDER: Twilio ──────────────────────────────────────────────────
// To switch to Meta WhatsApp Cloud API:
//   1. Open whatsapp.module.ts
//   2. Replace WhatsAppService with WhatsAppMetaService (see comments there)
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: ReturnType<typeof twilio>;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const accountSid = this.config.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const authToken  = this.config.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    this.from        = this.config.getOrThrow<string>('TWILIO_WHATSAPP_NUMBER'); // e.g. whatsapp:+14155238886
    this.client      = twilio(accountSid, authToken);
  }

  // ─── Main: send receipt to donor's WhatsApp ───────────────────────────────────
  async sendReceiptPdf(
    mobileNumber: string,
    receiptUrl: string,
    donorName: string,
    receiptNumber: string,
    amount: number,
    donationType: string,
  ): Promise<{ success: boolean; recipientNumber?: string; error?: string }> {
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

      // Message 1 — greeting text
      await this.client.messages.create({ from: this.from, to, body: greeting });

      // Message 2 — PDF as media
      await this.client.messages.create({
        from: this.from,
        to,
        body: `📄 Receipt *${receiptNumber}*`,
        mediaUrl: [receiptUrl],
      });

      this.logger.log(`✅ Receipt ${receiptNumber} sent to ${to} via Twilio`);
      return { success: true, recipientNumber: to };
    } catch (error: any) {
      const msg: string = error?.message ?? 'Unknown Twilio error';
      this.logger.error(`Failed to send WhatsApp to ${to}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  // ─── Send a simple test message ───────────────────────────────────────────────
  async sendTestMessage(
    mobileNumber: string,
  ): Promise<{ success: boolean; error?: string }> {
    const to = this.toWhatsApp(mobileNumber);
    try {
      await this.client.messages.create({
        from: this.from,
        to,
        body: 'Hello from SDI Education Centre! 👋 WhatsApp connection test successful.',
      });
      this.logger.log(`✅ Test message sent to ${to} via Twilio`);
      return { success: true };
    } catch (error: any) {
      const msg: string = error?.message ?? 'Unknown Twilio error';
      this.logger.error(`Test message failed for ${to}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  // ─── Normalize to Twilio WhatsApp format: whatsapp:+91XXXXXXXXXX ──────────────
  private toWhatsApp(mobile: string): string {
    let num = mobile.replace(/[\s\-\(\)]/g, '');
    if (num.startsWith('whatsapp:')) return num;
    if (num.startsWith('+')) return `whatsapp:${num}`;
    num = num.replace(/^0/, '');
    if (num.length === 10) num = `91${num}`;
    return `whatsapp:+${num}`;
  }
}