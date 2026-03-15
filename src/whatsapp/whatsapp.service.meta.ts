// ─── INACTIVE PROVIDER: Meta WhatsApp Cloud API ───────────────────────────────
// To switch from Twilio to Meta:
//   1. Open whatsapp.module.ts
//   2. Follow the swap instructions in the comments there
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

@Injectable()
export class WhatsAppMetaService {
  private readonly logger = new Logger(WhatsAppMetaService.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly apiVersion: string;

  constructor(private readonly config: ConfigService) {
    this.phoneNumberId = this.config.getOrThrow<string>('PHONE_NUMBER_ID');
    this.accessToken   = this.config.getOrThrow<string>('META_ACCESS_TOKEN');
    this.apiVersion    = this.config.get<string>('META_API_VERSION', 'v19.0');
  }

  // ─── Main: send receipt PDF to donor's WhatsApp ───────────────────────────────
  async sendReceiptPdf(
    mobileNumber: string,
    pdfUrl: string,
    donorName: string,
    receiptNumber: string,
    amount: number,
    donationType: string,
  ): Promise<{ success: boolean; messageId?: string; recipientNumber?: string; error?: string }> {
    const to = this.formatNumber(mobileNumber);

    try {
      const textBody =
        `Assalamualaikum ${donorName}! 🌙\n\n` +
        `Jazakallah Khair for your generous *${donationType}* donation to *SDI Education Centre*.\n\n` +
        `🧾 Receipt No: ${receiptNumber}\n` +
        `💰 Amount: Rs.${Number(amount).toLocaleString('en-IN')}\n\n` +
        `Your official receipt is attached below.\n` +
        `May Allah (SWT) accept your contribution. 🤲 Aameen`;

      // Message 1 — greeting text
      await this.postToMeta({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: textBody },
      });

      // Message 2 — PDF document
      const docResponse = await this.postToMeta({
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: {
          link: pdfUrl,
          filename: `${receiptNumber}.pdf`,
          caption: `Donation Receipt - ${receiptNumber}`,
        },
      });

      const messageId: string = docResponse?.messages?.[0]?.id ?? 'unknown';
      this.logger.log(`✅ Receipt ${receiptNumber} sent to ${to} via Meta Cloud API (msgId: ${messageId})`);
      return { success: true, messageId, recipientNumber: to };
    } catch (error: any) {
      const msg = this.extractError(error);
      this.logger.error(`Failed to send WhatsApp to ${to}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  // ─── Send a simple test message ───────────────────────────────────────────────
  async sendTestMessage(
    mobileNumber: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const to = this.formatNumber(mobileNumber);
    try {
      const response = await this.postToMeta({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: 'Hello from SDI Education Centre! 👋 WhatsApp connection test successful.' },
      });
      const messageId: string = response?.messages?.[0]?.id ?? 'unknown';
      this.logger.log(`✅ Test message sent to ${to} via Meta (msgId: ${messageId})`);
      return { success: true, messageId };
    } catch (error: any) {
      const msg = this.extractError(error);
      this.logger.error(`Test message failed for ${to}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  // ─── POST to Meta Graph API ────────────────────────────────────────────────────
  private async postToMeta(payload: Record<string, unknown>): Promise<any> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    const { data } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return data;
  }

  // ─── Normalize to Meta format: 91XXXXXXXXXX ───────────────────────────────────
  private formatNumber(mobile: string): string {
    let num = mobile.replace(/\D/g, '');
    num = num.replace(/^0/, '');
    if (num.length === 10) num = `91${num}`;
    return num;
  }

  // ─── Extract readable error from Axios / Meta response ────────────────────────
  private extractError(error: unknown): string {
    if (error instanceof AxiosError) {
      const metaError = error.response?.data?.error;
      if (metaError) {
        this.logger.error('Meta API error response:', JSON.stringify(metaError));
        return metaError.message ?? JSON.stringify(metaError);
      }
      return error.message;
    }
    return (error as any)?.message ?? 'Unknown error';
  }
}
