import mongoose, { Schema, Document } from 'mongoose';
import dbConnect from '../db';
import type { UserDTO } from '@/dtos';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: [true, 'Please provide a password'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default UserModel;

export function mapToUserType(doc: IUser): UserDTO {
  return {
    id: doc._id.toString(),
    email: doc.email,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt,
  };
}

export async function createUser(email: string, passwordHash: string): Promise<UserDTO> {
  await dbConnect();
  const user = await UserModel.create({
    email: email.toLowerCase().trim(),
    passwordHash,
  });
  return mapToUserType(user);
}

export async function findUserByEmail(email: string): Promise<UserDTO | undefined> {
  await dbConnect();
  const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean<IUser>();
  if (!user) return undefined;
  return mapToUserType(user);
}

export async function clearUsers(): Promise<void> {
  await dbConnect();
  await UserModel.deleteMany({});
}
