import mongoose, { Schema, Document } from 'mongoose';

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

export default mongoose.models.WBSItem || mongoose.model<IWBSItem>('WBSItem', WBSItemSchema);
