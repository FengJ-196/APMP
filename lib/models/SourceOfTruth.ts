import mongoose, { Schema, Document } from 'mongoose';
import type { SourceOfTruthDTO } from '@/dtos';
import dbConnect from '../db';

export interface IVersionSnapshot {
    versionNumber: number;
    content: string;
    savedAt: Date;
}

export interface ISourceOfTruth extends Document {
    projectId: mongoose.Types.ObjectId;
    content: string;
    versionNumber: number;
    versionHistory: IVersionSnapshot[];
    createdAt: Date;
    updatedAt: Date;

    snapshotVersion(): void;
}

const VersionSnapshotSchema = new Schema<IVersionSnapshot>(
    {
        versionNumber: { type: Number, required: true },
        content: { type: String, required: false, default: '' },
        savedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const SourceOfTruthSchema = new Schema<ISourceOfTruth>(
    {
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
        content: { type: String, default: '' },
        versionNumber: { type: Number, required: true, default: 1 },
        versionHistory: [VersionSnapshotSchema],
    },
    { timestamps: true }
);

/**
 * Snapshots the current state into versionHistory before a change.
 * Increments versionNumber.
 */
SourceOfTruthSchema.methods.snapshotVersion = function (): void {
    this.versionHistory.push({
        versionNumber: this.versionNumber,
        content: this.content || '',
        savedAt: new Date(),
    });

    this.versionNumber += 1;
};

// Force model refresh in development to avoid schema caching issues
if (process.env.NODE_ENV === 'development' && mongoose.models.SourceOfTruth) {
  delete mongoose.models.SourceOfTruth;
}

const SourceOfTruthModel = mongoose.models.SourceOfTruth || mongoose.model<ISourceOfTruth>('SourceOfTruth', SourceOfTruthSchema);
export default SourceOfTruthModel;

export interface CreateSourceOfTruthInput {
  projectId: string;
  content?: string;
}

export function mapToSourceOfTruthDTO(doc: ISourceOfTruth): SourceOfTruthDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    content: doc.content,
    versionNumber: doc.versionNumber,
    versionHistory: (doc.versionHistory ?? []).map((v: IVersionSnapshot) => ({
      versionNumber: v.versionNumber,
      content: v.content, // might be undefined if projected out
      savedAt: v.savedAt,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function createSourceOfTruth(
    input: CreateSourceOfTruthInput
): Promise<SourceOfTruthDTO> {
  await dbConnect();
  const doc = await SourceOfTruthModel.create(input);
  return mapToSourceOfTruthDTO(doc);
}

export async function findSourceOfTruthById(id: string): Promise<SourceOfTruthDTO | undefined> {
  if (!isValidObjectId(id)) return undefined;
  await dbConnect();
  const doc = await SourceOfTruthModel.findById(id).lean<ISourceOfTruth>();
  if (!doc) return undefined;
  return mapToSourceOfTruthDTO(doc);
}

export async function findSourceOfTruthByProjectId(
    projectId: string,
    includeHistoryContent: boolean = true
): Promise<SourceOfTruthDTO | undefined> {
  if (!isValidObjectId(projectId)) return undefined;
  await dbConnect();
  
  const query = SourceOfTruthModel.findOne({ projectId });
  if (!includeHistoryContent) {
    query.select({ 'versionHistory.content': 0 });
  }
  
  const doc = await query.lean<ISourceOfTruth>();
  if (!doc) return undefined;
  return mapToSourceOfTruthDTO(doc);
}

export type UpdateResult =
    | { updated: true; data: SourceOfTruthDTO }
    | { updated: false; data: SourceOfTruthDTO }
    | { updated: false; data: null };

export async function updateSourceOfTruth(
    id: string,
    content: string
): Promise<UpdateResult> {
  if (!isValidObjectId(id)) return { updated: false, data: null };

  await dbConnect();
  const doc = await SourceOfTruthModel.findById(id);
  if (!doc) return { updated: false, data: null };

  if (doc.content === content) {
    return { updated: false, data: mapToSourceOfTruthDTO(doc) };
  }

  try {
    doc.snapshotVersion();
    doc.content = content;
    await doc.save();
    return { updated: true, data: mapToSourceOfTruthDTO(doc) };
  } catch (err) {
    throw new Error(`Failed to update SourceOfTruth ${id}: ${(err as Error).message}`);
  }
}