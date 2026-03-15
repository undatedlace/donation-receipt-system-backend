import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Donation, DonationDocument } from './donation.schema';
import { CreateDonationDto } from './donation.dto';

@Injectable()
export class DonationsService {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
  ) {}

  async create(dto: CreateDonationDto, userId: string): Promise<DonationDocument> {
    const donation = new this.donationModel({
      ...dto,
      date: new Date(dto.date),
      createdBy: userId,
    });
    return donation.save();
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    donationType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 20, search, donationType, startDate, endDate } = query;
    const filter: any = {};

    if (search) {
      filter.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { receiptNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if (donationType) filter.donationType = donationType;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.donationModel
        .find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.donationModel.countDocuments(filter),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<DonationDocument> {
    const donation = await this.donationModel.findById(id).populate('createdBy', 'name email');
    if (!donation) throw new NotFoundException('Donation not found');
    return donation;
  }

  async findByReceiptNumber(receiptNumber: string): Promise<DonationDocument> {
    const donation = await this.donationModel.findOne({ receiptNumber });
    if (!donation) throw new NotFoundException('Donation not found');
    return donation;
  }

  async updateReceiptUrl(id: string, receiptUrl: string): Promise<DonationDocument> {
    const result = await this.donationModel.findByIdAndUpdate(id, { receiptUrl }, { new: true });
    if (!result) throw new NotFoundException('Donation not found');
    return result;
  }

  async markWhatsAppSent(id: string): Promise<DonationDocument> {
    const result = await this.donationModel.findByIdAndUpdate(
      id,
      { whatsappSent: true, whatsappSentAt: new Date() },
      { new: true },
    );
    if (!result) throw new NotFoundException('Donation not found');
    return result;
  }

  async delete(id: string): Promise<void> {
    const result = await this.donationModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Donation not found');
  }

  async exportAll() {
    return this.donationModel.find().sort({ createdAt: -1 }).lean();
  }

  async uploadQrImageToS3(file: Express.Multer.File): Promise<string> {
    const ext = (file.originalname.split('.').pop() ?? 'jpg').toLowerCase();
    const key = `qr-screenshots/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const region = process.env.AWS_REGION ?? 'ap-south-1';
    const bucket = process.env.AWS_S3_BUCKET!;

    const s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      followRegionRedirects: true,
    });

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    }));

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}