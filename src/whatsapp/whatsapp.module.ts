// ─── HOW TO SWITCH PROVIDERS ──────────────────────────────────────────────────
//
//  Currently ACTIVE: Twilio (whatsapp.service.ts)
//
//  To switch to Meta WhatsApp Cloud API:
//    1. Import  WhatsAppMetaService from './whatsapp.service.meta'
//    2. Replace WhatsAppService     with WhatsAppMetaService in providers[]
//    3. Replace WhatsAppService     with WhatsAppMetaService in exports[]
//    4. In whatsapp.controller.ts, change the import + constructor type to WhatsAppMetaService
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';           // ← TWILIO (active)
// import { WhatsAppMetaService } from './whatsapp.service.meta'; // ← META  (swap in)
import { WhatsAppController } from './whatsapp.controller';
import { DonationsModule } from '../donations/donations.module';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [ConfigModule, DonationsModule, ReceiptsModule],
  providers: [WhatsAppService],           // ← swap with WhatsAppMetaService for Meta
  controllers: [WhatsAppController],
  exports: [WhatsAppService],             // ← swap with WhatsAppMetaService for Meta
})
export class WhatsAppModule {}