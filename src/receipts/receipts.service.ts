import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReceiptsService {
  private storageDir = path.join(process.cwd(), 'receipts');

  async generatePdf(donation: any): Promise<string> {
    const filename = `${donation.receiptNumber}.pdf`;
    const filepath = path.join(this.storageDir, filename);

    await this.createIslamicPdf(donation, filepath);

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/receipts/${filename}`;
  }

  private createIslamicPdf(donation: any, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // ─── Colors ───────────────────────────────────────────────
      const GREEN = '#1B6B3A';
      const GOLD = '#C8963E';
      const LIGHT_GREEN = '#E8F5EE';
      const WHITE = '#FFFFFF';
      const DARK = '#1A1A1A';

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 50;

      // ─── Background ───────────────────────────────────────────
      doc.rect(0, 0, pageWidth, pageHeight).fill('#FAFAF7');

      // ─── Top Green Header Band ────────────────────────────────
      doc.rect(0, 0, pageWidth, 130).fill(GREEN);

      // Gold top border line
      doc.rect(0, 0, pageWidth, 6).fill(GOLD);

      // ─── Arabic Bismillah ─────────────────────────────────────
      doc
        .fillColor(GOLD)
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', margin, 18, {
          align: 'center',
          width: pageWidth - margin * 2,
        });

      // ─── Organization Name ────────────────────────────────────
      doc
        .fillColor(WHITE)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('NOORI DONATION CENTRE', margin, 52, {
          align: 'center',
          width: pageWidth - margin * 2,
        });

      doc
        .fillColor(GOLD)
        .fontSize(11)
        .font('Helvetica')
        .text('Official Donation Receipt', margin, 78, {
          align: 'center',
          width: pageWidth - margin * 2,
        });

      // ─── Decorative Divider ───────────────────────────────────
      doc.rect(margin, 100, pageWidth - margin * 2, 2).fill(GOLD);

      // Islamic star pattern dots
      for (let i = 0; i < 8; i++) {
        const x = margin + 30 + i * ((pageWidth - margin * 2 - 60) / 7);
        doc.circle(x, 101, 3).fill(GOLD);
      }

      // ─── Receipt Number Badge ─────────────────────────────────
      const badgeY = 140;
      doc.rect(margin, badgeY, pageWidth - margin * 2, 44).fill(LIGHT_GREEN).stroke(GREEN);
      doc.rect(margin, badgeY, pageWidth - margin * 2, 44).stroke();

      doc
        .fillColor(GREEN)
        .fontSize(11)
        .font('Helvetica')
        .text('RECEIPT NUMBER', margin, badgeY + 8, {
          align: 'center',
          width: pageWidth - margin * 2,
        });

      doc
        .fillColor(GREEN)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(donation.receiptNumber, margin, badgeY + 22, {
          align: 'center',
          width: pageWidth - margin * 2,
        });

      // ─── Two Column Info ──────────────────────────────────────
      const infoY = 205;
      const colW = (pageWidth - margin * 2 - 20) / 2;

      // Left column
      doc
        .fillColor(DARK)
        .fontSize(10)
        .font('Helvetica')
        .text('Date of Donation', margin, infoY)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(new Date(donation.date).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'long', year: 'numeric',
        }), margin, infoY + 15);

      // Right column
      doc
        .fillColor(DARK)
        .fontSize(10)
        .font('Helvetica')
        .text('Prepared By', margin + colW + 20, infoY)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(donation.fills || 'Admin', margin + colW + 20, infoY + 15);

      // ─── Green Section Header: Donor Info ─────────────────────
      const drawSectionHeader = (title: string, y: number) => {
        doc.rect(margin, y, pageWidth - margin * 2, 26).fill(GREEN);
        doc.fillColor(WHITE).fontSize(12).font('Helvetica-Bold')
          .text(title, margin + 12, y + 7);
        return y + 26;
      };

      // ─── Donor Information ────────────────────────────────────
      let y = 255;
      y = drawSectionHeader('DONOR INFORMATION', y);

      const drawRow = (label: string, value: string, rowY: number, shade = false) => {
        if (shade) doc.rect(margin, rowY, pageWidth - margin * 2, 28).fill('#F0F7F3');
        doc.rect(margin, rowY, pageWidth - margin * 2, 28).stroke('#D0E8D8');
        doc.fillColor('#666666').fontSize(10).font('Helvetica')
          .text(label, margin + 10, rowY + 8);
        doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold')
          .text(value || '-', margin + 170, rowY + 8);
        return rowY + 28;
      };

      y = drawRow('Full Name', donation.donorName, y, false);
      y = drawRow('Mobile Number', donation.mobileNumber, y, true);
      y = drawRow('Address', donation.address, y, false);

      // ─── Donation Details ─────────────────────────────────────
      y += 12;
      y = drawSectionHeader('DONATION DETAILS', y);

      y = drawRow('Donation Type', donation.donationType, y, false);
      y = drawRow('Payment Mode', donation.mode, y, true);
      if (donation.boxNumber) {
        y = drawRow('Box Number', `Box #${donation.boxNumber}`, y, false);
      }

      // ─── Amount Highlight Box ─────────────────────────────────
      y += 14;
      doc.rect(margin, y, pageWidth - margin * 2, 58).fill(GREEN);
      doc.fillColor(GOLD).fontSize(13).font('Helvetica-Bold')
        .text('TOTAL AMOUNT RECEIVED', margin, y + 10, {
          align: 'center', width: pageWidth - margin * 2,
        });
      doc.fillColor(WHITE).fontSize(26).font('Helvetica-Bold')
        .text(`₹ ${Number(donation.amount).toLocaleString('en-IN')}`, margin, y + 26, {
          align: 'center', width: pageWidth - margin * 2,
        });

      // ─── Dua / Blessing ──────────────────────────────────────
      y += 78;
      doc.rect(margin, y, pageWidth - margin * 2, 54).fill('#FEF9EC').stroke(GOLD);
      doc.fillColor(GOLD).fontSize(14).font('Helvetica-Bold')
        .text('جَزَاكَ اللَّهُ خَيْرًا', margin, y + 8, {
          align: 'center', width: pageWidth - margin * 2,
        });
      doc.fillColor('#8B6914').fontSize(10).font('Helvetica')
        .text('"May Allah reward you with goodness"', margin, y + 28, {
          align: 'center', width: pageWidth - margin * 2,
        });
      doc.fillColor('#666666').fontSize(9)
        .text('Your donation is a Sadaqah. May Allah accept it and bless you in this world and the Hereafter.', margin, y + 42, {
          align: 'center', width: pageWidth - margin * 2,
        });

      // ─── Footer ───────────────────────────────────────────────
      const footerY = pageHeight - 80;
      doc.rect(0, footerY, pageWidth, 80).fill(GREEN);
      doc.rect(0, footerY, pageWidth, 4).fill(GOLD);

      doc.fillColor(WHITE).fontSize(9).font('Helvetica')
        .text('This is an official receipt for your donation records. Please retain for your reference.', margin, footerY + 14, {
          align: 'center', width: pageWidth - margin * 2,
        });
      doc.fillColor(GOLD).fontSize(9)
        .text(`Generated: ${new Date().toLocaleString('en-IN')}  |  Receipt: ${donation.receiptNumber}`, margin, footerY + 30, {
          align: 'center', width: pageWidth - margin * 2,
        });
      doc.fillColor(WHITE).fontSize(8)
        .text('Noori Donation Centre  •  Authorized Receipt', margin, footerY + 48, {
          align: 'center', width: pageWidth - margin * 2,
        });

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}