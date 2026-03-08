import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

// whatsapp-web.js is loaded dynamically to avoid issues in environments without Chrome
let Client: any, LocalAuth: any, MessageMedia: any;
try {
  const wwebjs = require('whatsapp-web.js');
  Client = wwebjs.Client;
  LocalAuth = wwebjs.LocalAuth;
  MessageMedia = wwebjs.MessageMedia;
} catch (e) {
  // whatsapp-web.js not available
}

@Injectable()
export class WhatsAppService extends EventEmitter implements OnModuleInit {
  private client: any = null;
  private readonly logger = new Logger(WhatsAppService.name);
  public isReady = false;
  public qrCode: string | null = null;

  async onModuleInit() {
    if (!Client) {
      this.logger.warn('whatsapp-web.js not loaded. WhatsApp features disabled.');
      return;
    }
    this.initClient();
  }

  private initClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      },
    });

    this.client.on('qr', (qr: string) => {
      this.qrCode = qr;
      this.isReady = false;
      this.logger.log('QR Code generated. Scan with WhatsApp.');
      this.emit('qr', qr);
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.qrCode = null;
      this.logger.log('✅ WhatsApp client is ready!');
      this.emit('ready');
    });

    this.client.on('disconnected', () => {
      this.isReady = false;
      this.logger.warn('WhatsApp disconnected. Re-initializing...');
      setTimeout(() => this.initClient(), 5000);
    });

    this.client.initialize().catch((err: any) => {
      this.logger.error('WhatsApp init error:', err.message);
    });
  }

  async sendPdf(mobileNumber: string, pdfPath: string, donorName: string, receiptNumber: string): Promise<boolean> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client is not ready. Please scan the QR code first.');
    }

    // Format number: remove spaces, dashes; add country code if needed
    let number = mobileNumber.replace(/[\s\-\(\)]/g, '');
    if (!number.startsWith('+')) {
      // Default to India +91 — change as needed
      number = `+91${number.replace(/^0/, '')}`;
    }
    const chatId = `${number.replace('+', '')}@c.us`;

    const fs = require('fs');
    const media = MessageMedia.fromFilePath(pdfPath);

    const greeting = `Assalamu Alaikum wa Rahmatullahi wa Barakatuh 🌙\n\nDear *${donorName}*,\n\nJazakAllah Khair for your generous donation. Please find your official receipt attached.\n\n📄 *Receipt:* ${receiptNumber}\n\nMay Allah accept your Sadaqah and bless you abundantly. 🤲\n\n— Noori Donation Centre`;

    await this.client.sendMessage(chatId, greeting);
    await this.client.sendMessage(chatId, media, {
      caption: `Receipt ${receiptNumber}.pdf`,
    });

    return true;
  }

  getStatus() {
    return {
      isReady: this.isReady,
      hasQr: !!this.qrCode,
    };
  }

  getQr() {
    return this.qrCode;
  }
}