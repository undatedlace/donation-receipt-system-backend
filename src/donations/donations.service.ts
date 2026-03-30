import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Donation, DonationDocument } from './donation.schema';
import { CreateDonationDto, UpdateDonationDto } from './donation.dto';

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
    mode?: string;
    zone?: string;
    branch?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    userRoles?: string[];
  }) {
    const { page = 1, limit = 20, search, donationType, mode, zone, branch, startDate, endDate, userId, userRoles } = query;
    const filter: any = {};

    // Non-admins can only see their own donations
    const isAdmin = (userRoles ?? []).includes('admin');
    if (!isAdmin && userId) {
      filter.createdBy = userId;
    }

    if (search) {
      filter.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { receiptNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if (donationType) filter.donationType = donationType;
    if (mode) filter.mode = mode;
    if (zone) filter.zone = { $regex: zone, $options: 'i' };
    if (branch) filter.branch = { $regex: branch, $options: 'i' };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.donationModel
        .find(filter)
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.donationModel.countDocuments(filter),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<DonationDocument> {
    const donation = await this.donationModel.findById(id).populate('createdBy', 'firstName lastName email');
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

  async update(id: string, dto: UpdateDonationDto, userId: string, userRoles: string[]): Promise<DonationDocument> {
    const isAdmin = userRoles.includes('admin');
    if (!isAdmin) {
      const existing = await this.donationModel.findById(id);
      if (!existing) throw new NotFoundException('Donation not found');
      if (String(existing.createdBy) !== userId)
        throw new ForbiddenException('You can only edit your own donations');
    }
    const update: any = { ...dto };
    if (dto.date) update.date = new Date(dto.date);
    const result = await this.donationModel.findByIdAndUpdate(id, update, { new: true });
    if (!result) throw new NotFoundException('Donation not found');
    return result;
  }

  async delete(id: string, userId: string, userRoles: string[]): Promise<void> {
    const isAdmin = userRoles.includes('admin');
    if (!isAdmin) {
      const existing = await this.donationModel.findById(id);
      if (!existing) throw new NotFoundException('Donation not found');
      if (String(existing.createdBy) !== userId)
        throw new ForbiddenException('You can only delete your own donations');
    }
    const result = await this.donationModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Donation not found');
  }

  async deleteMany(ids: string[], userId: string, userRoles: string[]): Promise<{ deleted: number }> {
    const isAdmin = userRoles.includes('admin');
    if (!isAdmin) {
      const docs = await this.donationModel.find({ _id: { $in: ids } }).select('createdBy');
      const forbidden = docs.filter(d => String(d.createdBy) !== userId);
      if (forbidden.length > 0)
        throw new ForbiddenException('You can only delete your own donations');
    }
    const result = await this.donationModel.deleteMany({ _id: { $in: ids } });
    return { deleted: result.deletedCount };
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

  async uploadChequeImageToS3(file: Express.Multer.File): Promise<string> {
    const ext = (file.originalname.split('.').pop() ?? 'jpg').toLowerCase();
    const key = `cheque-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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