import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(firstName: string, lastName: string, email: string, password: string, roles: string[], zone?: string, branch?: string): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email: email.toLowerCase() });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(password, 10);
    const user = new this.userModel({ firstName, lastName, email, password: hashed, plainPassword: password, roles, zone, branch });
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-password').exec() as Promise<UserDocument | null>;
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password').exec();
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    if (dto.email) {
      const conflict = await this.userModel.findOne({ email: dto.email.toLowerCase(), _id: { $ne: id } });
      if (conflict) throw new ConflictException('Email already in use by another account');
      dto.email = dto.email.toLowerCase();
    }
    if (dto.password) {
      const plain = dto.password;
      (dto as any).password = await bcrypt.hash(plain, 10);
      (dto as any).plainPassword = plain;
    }
    const user = await this.userModel.findByIdAndUpdate(id, dto, { new: true }).select('-password');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updatePlainPassword(id: string, plain: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { plainPassword: plain });
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('User not found');
  }

  async updateSelf(userId: string, dto: { firstName?: string; lastName?: string; email?: string; password?: string }): Promise<UserDocument> {
    if (dto.email) {
      const conflict = await this.userModel.findOne({ email: dto.email.toLowerCase(), _id: { $ne: userId } });
      if (conflict) throw new ConflictException('Email already in use by another account');
      dto.email = dto.email.toLowerCase();
    }
    if (dto.password) {
      const plain = dto.password;
      (dto as any).password = await bcrypt.hash(plain, 10);
      (dto as any).plainPassword = plain;
    }
    const user = await this.userModel.findByIdAndUpdate(userId, dto, { new: true }).select('-password');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}