import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  plainPassword: string;

  @Prop({ type: [String], default: ['user'] })
  roles: string[];

  @Prop({ default: true })
  firstName: string;

  @Prop({ default: true })
  lastName: string;

  @Prop()
  phone: string;

  @Prop()
  zone: string;

  @Prop()
  branch: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
