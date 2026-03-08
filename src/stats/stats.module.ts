import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Donation, DonationSchema } from '../donations/donation.schema';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Donation.name, schema: DonationSchema }])],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}