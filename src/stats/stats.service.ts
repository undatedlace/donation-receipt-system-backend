import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Donation, DonationDocument } from '../donations/donation.schema';

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
  ) {}

  async getDashboardStats(userId: string, userRoles: string[]) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const isAdmin = userRoles.includes('admin');

    // Base filter: non-admins only see their own donations
    const baseFilter: any = isAdmin ? {} : { createdBy: userId };
    const monthFilter: any = { ...baseFilter, createdAt: { $gte: startOfMonth } };
    const matchStage = isAdmin
      ? []
      : [{ $match: { $expr: { $eq: [{ $toString: '$createdBy' }, userId] } } }];

    const [
      totalDonations,
      totalAmount,
      monthlyDonations,
      byType,
      byMode,
      recentDonations,
      monthlyTrend,
      byUser,
    ] = await Promise.all([
      this.donationModel.countDocuments(baseFilter),
      this.donationModel.aggregate([
        ...matchStage,
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.donationModel.countDocuments(monthFilter),
      this.donationModel.aggregate([
        ...matchStage,
        { $group: { _id: '$donationType', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
      this.donationModel.aggregate([
        ...matchStage,
        { $group: { _id: '$mode', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
      this.donationModel.find(baseFilter).sort({ createdAt: -1 }).limit(5)
        .select('donorName amount donationType receiptNumber createdAt whatsappSent'),
      this.donationModel.aggregate([
        ...matchStage,
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
      // Collection by user — admin only
      isAdmin
        ? this.donationModel.aggregate([
            {
              $group: {
                _id: '$createdBy',
                count: { $sum: 1 },
                total: { $sum: '$amount' },
              },
            },
            {
              // Convert the string createdBy to ObjectId so $lookup can join on _id
              $addFields: {
                createdByObjId: { $toObjectId: '$_id' },
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'createdByObjId',
                foreignField: '_id',
                as: 'userInfo',
              },
            },
            {
              $unwind: {
                path: '$userInfo',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 1,
                count: 1,
                total: 1,
                name: {
                  $cond: {
                    if: { $ifNull: ['$userInfo', false] },
                    then: {
                      $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'],
                    },
                    else: 'Unknown',
                  },
                },
              },
            },
            { $sort: { total: -1 } },
          ])
        : Promise.resolve([]),
    ]);

    return {
      totalDonations,
      totalAmount: totalAmount[0]?.total || 0,
      monthlyDonations,
      byType,
      byMode,
      recentDonations,
      monthlyTrend: monthlyTrend.reverse(),
      byUser,
    };
  }
}