import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DonationDocument = Donation & Document;

export enum DonationType {
  ZAKAT = 'Zakat',
  FITRA = 'Fitra',
  ATIYAAT = 'Atiyaat',
  NOORI_BOX = 'Noori Box',
}

export enum PaymentMode {
  CHEQUE = 'Cheque',
  BANK_TRANSFER = 'Bank Transfer',
  QR = 'QR',
  CASH = 'Cash',
}

@Schema({ timestamps: true })
export class Donation {
  @Prop({ required: true })
  fills: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  donorName: string;

  @Prop({ required: true })
  mobileNumber: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true, enum: DonationType })
  donationType: DonationType;

  @Prop({ required: true, enum: PaymentMode })
  mode: PaymentMode;

  @Prop({ min: 1, max: 100 })
  boxNumber: number;

  @Prop({ required: true })
  amount: number;

  @Prop({ unique: true })
  receiptNumber: string;

  @Prop()
  receiptUrl: string;

  @Prop({ default: false })
  whatsappSent: boolean;

  @Prop()
  whatsappSentAt: Date;

  @Prop()
  qrImageUrl: string;

  @Prop()
  zone: string;

  @Prop()
  branch: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const DonationSchema = SchemaFactory.createForClass(Donation);

// Auto-generate receipt number before save
DonationSchema.pre('save', async function (next) {
  if (!this.receiptNumber) {
    const year = new Date().getFullYear();
    const DonationModel = this.constructor as any;
    const count = await DonationModel.countDocuments({
      receiptNumber: { $regex: `^RCP-${year}-` },
    });
    const seq = String(count + 1).padStart(4, '0');
    this.receiptNumber = `RCP-${year}-${seq}`;
  }
  next();
});