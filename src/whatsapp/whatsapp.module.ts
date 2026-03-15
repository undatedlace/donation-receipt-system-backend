import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { DonationsModule } from '../donations/donations.module';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [ConfigModule, DonationsModule, ReceiptsModule],
  providers: [WhatsAppService],
  controllers: [WhatsAppController],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}