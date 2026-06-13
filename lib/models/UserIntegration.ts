import mongoose, { Schema, Document } from 'mongoose';
import type { UserIntegrationDTO } from '@/dtos';
import dbConnect from '../db';

export interface IUserIntegration extends Document {
  userId: mongoose.Types.ObjectId;
  platform: 'github' | 'jira';
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  expiresAt?: Date;
  cloudId?: string;
  domain?: string;
  email?: string;
  authType: 'oauth' | 'basic';
  createdAt: Date;
}

const UserIntegrationSchema = new Schema<IUserIntegration>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  platform: {
    type: String,
    enum: ['github', 'jira'],
    required: true,
  },
  encryptedAccessToken: {
    type: String,
    required: true,
  },
  encryptedRefreshToken: {
    type: String,
  },
  expiresAt: {
    type: Date,
  },
  cloudId: {
    type: String,
  },
  domain: {
    type: String,
  },
  email: {
    type: String,
  },
  authType: {
    type: String,
    enum: ['oauth', 'basic'],
    default: 'oauth',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a user can only have one integration per platform
UserIntegrationSchema.index({ userId: 1, platform: 1 }, { unique: true });

const UserIntegrationModel =
  mongoose.models.UserIntegration ||
  mongoose.model<IUserIntegration>('UserIntegration', UserIntegrationSchema);

export default UserIntegrationModel;

export function mapToUserIntegrationType(doc: any): UserIntegrationDTO {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    platform: doc.platform,
    encryptedAccessToken: doc.encryptedAccessToken,
    encryptedRefreshToken: doc.encryptedRefreshToken,
    expiresAt: doc.expiresAt,
    cloudId: doc.cloudId,
    domain: doc.domain,
    email: doc.email,
    authType: doc.authType,
    createdAt: doc.createdAt,
  };
}

export async function getIntegration(userId: string, platform: 'github' | 'jira'): Promise<UserIntegrationDTO | undefined> {
  await dbConnect();
  const integration = await UserIntegrationModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    platform,
  }).lean();
  if (!integration) return undefined;
  return mapToUserIntegrationType(integration);
}

export async function saveIntegration(data: Omit<UserIntegrationDTO, 'id' | 'createdAt'>): Promise<UserIntegrationDTO> {
  await dbConnect();
  const query = { userId: new mongoose.Types.ObjectId(data.userId), platform: data.platform };
  const update = {
    ...data,
    userId: new mongoose.Types.ObjectId(data.userId),
  };
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };
  const doc = await UserIntegrationModel.findOneAndUpdate(query, update, options);
  return mapToUserIntegrationType(doc);
}

export async function deleteIntegration(userId: string, platform: 'github' | 'jira'): Promise<boolean> {
  await dbConnect();
  const result = await UserIntegrationModel.deleteOne({
    userId: new mongoose.Types.ObjectId(userId),
    platform,
  });
  return result.deletedCount > 0;
}
