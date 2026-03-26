import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StatsModule } from './stats/stats.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { DonationsModule } from './donations/donations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.NODE_ENV === 'production'
        ? (process.env.MONGO_URI_PROD || process.env.MONGO_URI || 'mongodb://localhost:27017/donation-app')
        : (process.env.MONGO_URI_TEST || process.env.MONGO_URI || 'mongodb://localhost:27017/donation-app-test'),
    ),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'receipts'),
      serveRoot: '/receipts',
    }),
    AuthModule,
    UsersModule,
    DonationsModule,
    ReceiptsModule,
    WhatsAppModule,
    StatsModule,
  ],
})
export class AppModule {}