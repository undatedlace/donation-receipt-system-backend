import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Donation, DonationDocument } from '../donations/donation.schema';

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
  ) {}

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalDonations,
      totalAmount,
      monthlyDonations,
      byType,
      byMode,
      recentDonations,
      monthlyTrend,
    ] = await Promise.all([
      this.donationModel.countDocuments(),
      this.donationModel.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      this.donationModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      this.donationModel.aggregate([
        { $group: { _id: '$donationType', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
      this.donationModel.aggregate([
        { $group: { _id: '$mode', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
      this.donationModel.find().sort({ createdAt: -1 }).limit(5)
        .select('donorName amount donationType receiptNumber createdAt whatsappSent'),
      this.donationModel.aggregate([
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            count: { $sum: 1 },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
    ]);

    return {
      totalDonations,
      totalAmount: totalAmount[0]?.total || 0,
      monthlyDonations,
      byType,
      byMode,
      recentDonations,
      monthlyTrend: monthlyTrend.reverse(),
    };
  }
}