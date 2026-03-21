import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface DonationForReceipt {
  receiptNumber: string;
  donorName: string;
  mobileNumber: string;   // without +91 prefix
  address: string;
  donationType: string;   // e.g. "Fitra", "Zakat"
  mode: string;           // e.g. "Cash", "UPI"
  date: string | Date;    // e.g. "15/3/2026" or a Date object
  fills: string;          // prepared-by name
  amount: number;
  receiptUrl?: string;
}

@Injectable()
export class ReceiptsService {
  private readonly logger     = new Logger(ReceiptsService.name);
  private readonly scriptPath = path.join(process.cwd(), 'generate_receipt.py');
  private readonly tmpDir     = path.join(process.cwd(), 'receipts_tmp');
  private readonly s3         : S3Client;
  private readonly bucket     : string;
  private readonly region     : string;

  constructor() {
    this.region = process.env.AWS_REGION ?? 'ap-south-1';
    this.bucket = process.env.AWS_S3_BUCKET!;
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      followRegionRedirects: true,
    });
    fs.mkdirSync(this.tmpDir, { recursive: true });
    if (!fs.existsSync(this.scriptPath))
      this.logger.warn(`PDF script not found: ${this.scriptPath}`);
  }

  async generatePdf(donation: DonationForReceipt): Promise<string> {
    const tmpPath = path.join(this.tmpDir, `${donation.receiptNumber}.pdf`);
    try {
      await this.runPython(donation, tmpPath);
      return await this.uploadToS3(tmpPath, donation.receiptNumber);
    } finally {
      fs.unlink(tmpPath, () => {});
    }
  }

  private async runPython(donation: DonationForReceipt, outPath: string): Promise<void> {
    const now  = new Date();
    const h12  = now.getHours() % 12 || 12;
    const ampm = now.getHours() < 12 ? 'am' : 'pm';
    const generatedAt =
      `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}, ` +
      `${h12}:${String(now.getMinutes()).padStart(2,'0')}:` +
      `${String(now.getSeconds()).padStart(2,'0')} ${ampm}`;

    const rd = donation.date instanceof Date ? donation.date : new Date(donation.date);
    const dateStr = `${rd.getDate()}/${rd.getMonth() + 1}/${rd.getFullYear()}`;

    const python = process.env.PYTHON_BIN ?? 'python3';
    const { stdout, stderr } = await execFileAsync(
      python,
      [this.scriptPath, JSON.stringify({ ...donation, date: dateStr, generatedAt }), outPath],
      { timeout: 30_000 },
    );
    if (stderr) this.logger.warn(`Python stderr: ${stderr}`);
    if (!stdout.startsWith('OK:'))
      throw new Error(`PDF generator failed: ${stdout} ${stderr}`);
    if (!fs.existsSync(outPath))
      throw new Error(`PDF not written: ${outPath}`);
  }

  private async uploadToS3(filePath: string, receiptNumber: string): Promise<string> {
    const key = `donation-receipts/${receiptNumber}.pdf`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key,
      Body: fs.readFileSync(filePath),
      ContentType: 'application/pdf',
      ACL: 'public-read',
    }));
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    this.logger.log(`Uploaded ${receiptNumber} → ${url}`);
    return url;
  }
}