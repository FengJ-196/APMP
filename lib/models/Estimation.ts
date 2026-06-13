import mongoose, { Schema, Document } from 'mongoose';
import dbConnect from '../db';
import type { StoryPointDTO, ExternalSyncDTO } from '@/dtos';

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

export function mapToStoryPointType(doc: IStoryPoint): StoryPointDTO {
  return {
    id: doc._id.toString(),
    wbsItemId: doc.wbsItemId.toString(),
    projectId: doc.projectId.toString(),
    ragReferences: doc.ragReferences?.map((r) => ({
      similarProjectId: r.similarProjectId?.toString() || '',
      similarItemTitle: r.similarItemTitle,
      similarItemPoints: r.similarItemPoints,
      similarityScore: r.similarityScore,
    })) || [],
    aiSuggestedPoints: doc.aiSuggestedPoints,
    finalPoints: doc.finalPoints,
    rationale: doc.rationale,
    confidence: doc.confidence,
    decidedBy: doc.decidedBy?.toString(),
    createdAt: doc.createdAt,
  };
}

export function mapToExternalSyncType(doc: IExternalSync): ExternalSyncDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    wbsItemId: doc.wbsItemId.toString(),
    platform: doc.platform,
    externalId: doc.externalId,
    externalUrl: doc.externalUrl,
    syncStatus: doc.syncStatus,
    errorMessage: doc.errorMessage,
    lastSyncedAt: doc.lastSyncedAt,
    createdAt: doc.createdAt,
  };
}

export async function createStoryPoint(input: Omit<StoryPointDTO, 'id' | 'createdAt'>): Promise<StoryPointDTO> {
  await dbConnect();
  const doc = await StoryPoint.create(input);
  return mapToStoryPointType(doc);
}

export async function findStoryPointByWbsItemId(wbsItemId: string): Promise<StoryPointDTO | undefined> {
  await dbConnect();
  const doc = await StoryPoint.findOne({ wbsItemId }).lean<IStoryPoint>();
  if (!doc) return undefined;
  return mapToStoryPointType(doc);
}

export async function createExternalSync(input: Omit<ExternalSyncDTO, 'id' | 'createdAt'>): Promise<ExternalSyncDTO> {
  await dbConnect();
  const doc = await ExternalSync.create(input);
  return mapToExternalSyncType(doc);
}

export async function findExternalSyncsByProjectId(projectId: string): Promise<ExternalSyncDTO[]> {
  await dbConnect();
  const docs = await ExternalSync.find({ projectId }).lean<IExternalSync[]>();
  return docs.map(mapToExternalSyncType);
}
