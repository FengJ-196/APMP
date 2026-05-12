import mongoose, { Schema, Document } from 'mongoose';
import dbConnect from '../db';
import type { WBSItemDTO, CreateWBSItemInputDTO } from '@/dtos';

export interface IWBSItem extends Document {
  projectId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  sourceOfTruthId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: 'epic' | 'feature' | 'story' | 'task' | 'subtask';
  status: 'ai_generated' | 'reviewed' | 'approved' | 'rejected';
  methodology?: 'scrum' | 'kanban' | 'waterfall';
  acceptanceCriteria: string[];
  sourceRequirements: string[]; // blockId[]
  order: number;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WBSItemSchema = new Schema<IWBSItem>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'WBSItem' },
  sourceOfTruthId: { type: Schema.Types.ObjectId, ref: 'SourceOfTruth' },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['epic', 'feature', 'story', 'task', 'subtask'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['ai_generated', 'reviewed', 'approved', 'rejected'], 
    default: 'ai_generated' 
  },
  methodology: { type: String, enum: ['scrum', 'kanban', 'waterfall'] },
  acceptanceCriteria: [{ type: String }],
  sourceRequirements: [{ type: String }],
  order: { type: Number, default: 0 },
  aiGenerated: { type: Boolean, default: true },
}, { timestamps: true });

WBSItemSchema.index({ projectId: 1, parentId: 1 });

const WBSItemModel = mongoose.models.WBSItem || mongoose.model<IWBSItem>('WBSItem', WBSItemSchema);
export default WBSItemModel;

export function mapToWBSItemType(doc: IWBSItem): WBSItemDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    parentId: doc.parentId?.toString(),
    sourceOfTruthId: doc.sourceOfTruthId?.toString(),
    title: doc.title,
    description: doc.description,
    type: doc.type,
    status: doc.status,
    methodology: doc.methodology,
    acceptanceCriteria: doc.acceptanceCriteria,
    sourceRequirements: doc.sourceRequirements,
    order: doc.order,
    aiGenerated: doc.aiGenerated,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createWBSItem(input: CreateWBSItemInputDTO): Promise<WBSItemDTO> {
  await dbConnect();
  const doc = await WBSItemModel.create(input);
  return mapToWBSItemType(doc);
}

export async function findWBSItemById(id: string): Promise<WBSItemDTO | undefined> {
  await dbConnect();
  const doc = await WBSItemModel.findById(id).lean<IWBSItem>();
  if (!doc) return undefined;
  return mapToWBSItemType(doc);
}

export async function findWBSItemsByProjectId(projectId: string): Promise<WBSItemDTO[]> {
  await dbConnect();
  const items = await WBSItemModel.find({ projectId }).lean<IWBSItem[]>();
  return items.map(mapToWBSItemType);
}

export async function deleteWBSItem(id: string): Promise<boolean> {
  await dbConnect();
  const result = await WBSItemModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
}
