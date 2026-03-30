import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, Res, Header, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DonationsService } from './donations.service';
import { CreateDonationDto, UpdateDonationDto } from './donation.dto';

@ApiTags('Donations')
@ApiBearerAuth()
@Controller('donations')
@UseGuards(JwtAuthGuard)
export class DonationsController {
  constructor(private donationsService: DonationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new donation' })
  @ApiBody({ type: CreateDonationDto })
  @ApiResponse({ status: 201, description: 'Donation created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateDonationDto, @Request() req) {
    return this.donationsService.create(dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all donations with optional filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'donorName', required: false, type: String, description: 'Filter by donor name' })
  @ApiQuery({ name: 'donationType', required: false, type: String, description: 'Filter by donation type' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of donations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: any, @Request() req) {
    return this.donationsService.findAll({
      ...query,
      userId: req.user.userId,
      userRoles: req.user.roles ?? [],
    });
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=donations.csv')
  @ApiOperation({ summary: 'Export all donations as a CSV file' })
  @ApiResponse({ status: 200, description: 'Returns a CSV file of all donations', content: { 'text/csv': {} } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportCsv(@Res() res: Response) {
    const records = await this.donationsService.exportAll();
    const headers = [
      'Receipt No', 'Date', 'Donor Name', 'Mobile', 'Address',
      'Donation Type', 'Mode', 'Box No', 'Amount', 'WhatsApp Sent',
    ];
    const rows = records.map((d) => [
      d.receiptNumber, new Date(d.date).toLocaleDateString(), d.donorName,
      d.mobileNumber, d.address, d.donationType, d.mode,
      d.boxNumber || '', d.amount, d.whatsappSent ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    res.send(csv);
  }

  // ─── POST /donations/upload-qr ─────────────────────────────────────────────────
  @Post('upload-qr')
  @ApiOperation({ summary: 'Upload a QR payment screenshot to S3 and get back the URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: '{ url: "https://..." }' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadQrImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.donationsService.uploadQrImageToS3(file);
    return { url };
  }

  // ─── POST /donations/upload-cheque ─────────────────────────────────────────────
  @Post('upload-cheque')
  @ApiOperation({ summary: 'Upload a cheque image to S3 and get back the URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: '{ url: "https://..." }' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadChequeImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.donationsService.uploadChequeImageToS3(file);
    return { url };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a donation by ID' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the donation' })
  @ApiResponse({ status: 200, description: 'Returns the donation' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string) {
    return this.donationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a donation (admin can edit all; user can only edit own)' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the donation' })
  @ApiBody({ type: UpdateDonationDto })
  @ApiResponse({ status: 200, description: 'Donation updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — not your donation' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  update(@Param('id') id: string, @Body() dto: UpdateDonationDto, @Request() req) {
    return this.donationsService.update(id, dto, req.user.userId, req.user.roles ?? []);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete donations (admin: any; user: own only)' })
  @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 201, description: '{ deleted: number }' })
  async bulkDelete(@Body() body: { ids: string[] }, @Request() req) {
    return this.donationsService.deleteMany(body.ids ?? [], req.user.userId, req.user.roles ?? []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a donation (admin: any; user: own only)' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the donation' })
  @ApiResponse({ status: 200, description: 'Donation deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  delete(@Param('id') id: string, @Request() req) {
    return this.donationsService.delete(id, req.user.userId, req.user.roles ?? []);
  }
}
