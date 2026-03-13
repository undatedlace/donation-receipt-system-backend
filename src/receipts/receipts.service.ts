import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class ReceiptsService {
  private storageDir = path.join(process.cwd(), 'receipts');
  private readonly logger = new Logger(ReceiptsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.bucket = process.env.AWS_S3_BUCKET!;

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      followRegionRedirects: true,
    });

    // Ensure local temp dir exists for PDF generation before S3 upload
    fs.mkdirSync(this.storageDir, { recursive: true });
  }

  async generatePdf(donation: any): Promise<string> {
    const filename = `${donation.receiptNumber}.pdf`;
    const filepath = path.join(this.storageDir, filename);

    // 1. Generate PDF as a local temp file
    await this.createIslamicPdf(donation, filepath);

    // 2. Upload to S3 and get permanent public URL
    const s3Url = await this.uploadToS3(filepath, donation.receiptNumber);

    // 3. Delete local temp file — keeps server disk clean
    fs.unlink(filepath, () => {});

    return s3Url;
  }

  private async uploadToS3(filepath: string, receiptNumber: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filepath);
    const key = `donation-receipts/${receiptNumber}.pdf`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: 'application/pdf',
        ACL: 'public-read',   // publicly accessible — needed for WhatsApp to fetch the URL
      }),
    );

    // Standard S3 public URL
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    this.logger.log(`Uploaded ${receiptNumber} to S3: ${url}`);
    return url;
  }

  private createIslamicPdf(donation: any, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // bottom: 5 prevents PDFKit auto-adding pages when footer text lands near the
      // default bottom margin threshold (margin: 50 → maxY = 791.89, footer at 791.89+)
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, left: 50, right: 50, bottom: 5 } });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Amiri is a Unicode Arabic font — required because PDFKit's built-in Helvetica/Times
      // are Latin-only Type1 fonts and render Arabic as garbled replacement characters.
      // Place fonts/Amiri-Regular.ttf in the project root (see README / setup instructions).
      const arabicFontPath = path.join(process.cwd(), 'fonts', 'Amiri-Regular.ttf');
      const hasArabicFont = fs.existsSync(arabicFontPath);
      if (hasArabicFont) doc.registerFont('Amiri', arabicFontPath);

      const GREEN = '#1B6B3A';
      const GOLD = '#C8963E';
      const LIGHT_GREEN = '#E8F5EE';
      const WHITE = '#FFFFFF';
      const DARK = '#1A1A1A';

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 50;

      doc.rect(0, 0, pageWidth, pageHeight).fill('#FAFAF7');
      doc.rect(0, 0, pageWidth, 130).fill(GREEN);
      doc.rect(0, 0, pageWidth, 6).fill(GOLD);

      if (hasArabicFont) {
        doc.fillColor(GOLD).fontSize(20).font('Amiri')
          .text('بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', margin, 18, { align: 'center', width: pageWidth - margin * 2 });
      } else {
        doc.fillColor(GOLD).fontSize(13).font('Helvetica-Bold')
          .text('Bismillahir Rahmanir Raheem', margin, 18, { align: 'center', width: pageWidth - margin * 2 });
      }

      doc.fillColor(WHITE).fontSize(20).font('Helvetica-Bold')
        .text('NOORI DONATION CENTRE', margin, 52, { align: 'center', width: pageWidth - margin * 2 });

      doc.fillColor(GOLD).fontSize(11).font('Helvetica')
        .text('Official Donation Receipt', margin, 78, { align: 'center', width: pageWidth - margin * 2 });

      doc.rect(margin, 100, pageWidth - margin * 2, 2).fill(GOLD);
      for (let i = 0; i < 8; i++) {
        const x = margin + 30 + i * ((pageWidth - margin * 2 - 60) / 7);
        doc.circle(x, 101, 3).fill(GOLD);
      }

      const badgeY = 140;
      doc.rect(margin, badgeY, pageWidth - margin * 2, 44).fill(LIGHT_GREEN).stroke(GREEN);
      doc.rect(margin, badgeY, pageWidth - margin * 2, 44).stroke();
      doc.fillColor(GREEN).fontSize(11).font('Helvetica')
        .text('RECEIPT NUMBER', margin, badgeY + 8, { align: 'center', width: pageWidth - margin * 2 });
      doc.fillColor(GREEN).fontSize(18).font('Helvetica-Bold')
        .text(donation.receiptNumber, margin, badgeY + 22, { align: 'center', width: pageWidth - margin * 2 });

      const infoY = 205;
      const colW = (pageWidth - margin * 2 - 20) / 2;

      doc.fillColor(DARK).fontSize(10).font('Helvetica').text('Date of Donation', margin, infoY)
        .font('Helvetica-Bold').fontSize(12)
        .text(new Date(donation.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), margin, infoY + 15);

      doc.fillColor(DARK).fontSize(10).font('Helvetica').text('Prepared By', margin + colW + 20, infoY)
        .font('Helvetica-Bold').fontSize(12)
        .text(donation.fills || 'Admin', margin + colW + 20, infoY + 15);

      const drawSectionHeader = (title: string, y: number) => {
        doc.rect(margin, y, pageWidth - margin * 2, 26).fill(GREEN);
        doc.fillColor(WHITE).fontSize(12).font('Helvetica-Bold').text(title, margin + 12, y + 7);
        return y + 26;
      };

      const drawRow = (label: string, value: string, rowY: number, shade = false) => {
        if (shade) doc.rect(margin, rowY, pageWidth - margin * 2, 28).fill('#F0F7F3');
        doc.rect(margin, rowY, pageWidth - margin * 2, 28).stroke('#D0E8D8');
        doc.fillColor('#666666').fontSize(10).font('Helvetica').text(label, margin + 10, rowY + 8);
        doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text(value || '-', margin + 170, rowY + 8);
        return rowY + 28;
      };

      let y = 255;
      y = drawSectionHeader('DONOR INFORMATION', y);
      y = drawRow('Full Name', donation.donorName, y, false);
      y = drawRow('Mobile Number', donation.mobileNumber, y, true);
      y = drawRow('Address', donation.address, y, false);

      y += 12;
      y = drawSectionHeader('DONATION DETAILS', y);
      y = drawRow('Donation Type', donation.donationType, y, false);
      y = drawRow('Payment Mode', donation.mode, y, true);
      if (donation.boxNumber) {
        y = drawRow('Box Number', `Box #${donation.boxNumber}`, y, false);
      }

      y += 14;
      doc.rect(margin, y, pageWidth - margin * 2, 58).fill(GREEN);
      doc.fillColor(GOLD).fontSize(13).font('Helvetica-Bold')
        .text('TOTAL AMOUNT RECEIVED', margin, y + 10, { align: 'center', width: pageWidth - margin * 2 });
      doc.fillColor(WHITE).fontSize(26).font('Helvetica-Bold')
        .text(`Rs. ${Number(donation.amount).toLocaleString('en-IN')}`, margin, y + 26, { align: 'center', width: pageWidth - margin * 2 });

      y += 78;
      doc.rect(margin, y, pageWidth - margin * 2, 54).fill('#FEF9EC').stroke(GOLD);
      if (hasArabicFont) {
        doc.fillColor(GOLD).fontSize(18).font('Amiri')
          .text('جَزَاكَ اللَّهُ خَيْرًا', margin, y + 8, { align: 'center', width: pageWidth - margin * 2 });
      } else {
        doc.fillColor(GOLD).fontSize(14).font('Helvetica-Bold')
          .text('Jazakallahu Khayran', margin, y + 8, { align: 'center', width: pageWidth - margin * 2 });
      }
      doc.fillColor('#8B6914').fontSize(10).font('Helvetica')
        .text('"May Allah reward you with goodness"', margin, y + 28, { align: 'center', width: pageWidth - margin * 2 });
      doc.fillColor('#666666').fontSize(9)
        .text('Your donation is a Sadaqah. May Allah accept it and bless you in this world and the Hereafter.', margin, y + 42, { align: 'center', width: pageWidth - margin * 2 });

      const footerY = pageHeight - 80;
      doc.rect(0, footerY, pageWidth, 80).fill(GREEN);
      doc.rect(0, footerY, pageWidth, 4).fill(GOLD);
      doc.fillColor(WHITE).fontSize(9).font('Helvetica')
        .text('This is an official receipt for your donation records. Please retain for your reference.', margin, footerY + 14, { align: 'center', width: pageWidth - margin * 2 });
      doc.fillColor(GOLD).fontSize(9)
        .text(`Generated: ${new Date().toLocaleString('en-IN')}  |  Receipt: ${donation.receiptNumber}`, margin, footerY + 30, { align: 'center', width: pageWidth - margin * 2 });
      doc.fillColor(WHITE).fontSize(8)
        .text('Noori Donation Centre  •  Authorized Receipt', margin, footerY + 48, { align: 'center', width: pageWidth - margin * 2 });

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}