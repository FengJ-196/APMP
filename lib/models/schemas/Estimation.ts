import mongoose, { Schema, Document } from 'mongoose';

export interface IStoryPoint extends Document {
  wbsItemId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  ragReferences: Array<{
    similarProjectId: mongoose.Types.ObjectId;
    similarItemTitle: string;
    similarItemPoints: number;
    similarityScore: number;
  }>;
  aiSuggestedPoints?: number;
  finalPoints?: number;
  rationale?: string;
  confidence: number;
  decidedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StoryPointSchema = new Schema<IStoryPoint>({
  wbsItemId: { type: Schema.Types.ObjectId, ref: 'WBSItem', required: true, unique: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  ragReferences: [{
    similarProjectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    similarItemTitle: { type: String },
    similarItemPoints: { type: Number },
    similarityScore: { type: Number, min: 0, max: 1 },
  }],
  aiSuggestedPoints: { type: Number },
  finalPoints: { type: Number },
  rationale: { type: String },
  confidence: { type: Number, min: 0, max: 1 },
  decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

export const StoryPoint = mongoose.models.StoryPoint || mongoose.model<IStoryPoint>('StoryPoint', StoryPointSchema);

// --- External Sync ---

export interface IExternalSync extends Document {
  projectId: mongoose.Types.ObjectId;
  wbsItemId: mongoose.Types.ObjectId;
  platform: 'jira' | 'github';
  externalId: string;
  externalUrl?: string;
  syncStatus: 'pending' | 'synced' | 'failed' | 'conflict';
  errorMessage?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
}

const ExternalSyncSchema = new Schema<IExternalSync>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  wbsItemId: { type: Schema.Types.ObjectId, ref: 'WBSItem', required: true },
  platform: { type: String, enum: ['jira', 'github'], required: true },
  externalId: { type: String, required: true },
  externalUrl: { type: String },
  syncStatus: { type: String, enum: ['pending', 'synced', 'failed', 'conflict'], default: 'pending' },
  errorMessage: { type: String },
  lastSyncedAt: { type: Date },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

ExternalSyncSchema.index({ wbsItemId: 1, platform: 1 }, { unique: true });

export const ExternalSync = mongoose.models.ExternalSync || mongoose.model<IExternalSync>('ExternalSync', ExternalSyncSchema);
