import mongoose, { Schema, Document } from 'mongoose';

export interface ISectionBlock {
  blockId: string;
  order: number;
  type: 'heading' | 'text' | 'table' | 'diagram';
  markdown?: string;
  diagram?: {
    mermaidCode: string;
    diagramType: 'flowchart' | 'sequence' | 'er' | 'usecase' | 'other';
    confidence: number;
  };
  userVerified: boolean;
  userEditedAt?: Date;
  originalAiContent?: string;
}

export interface ISourceOfTruth extends Document {
  projectId: mongoose.Types.ObjectId;
  fileId: mongoose.Types.ObjectId;
  versionNumber: number;
  blocks: ISectionBlock[];
  compiledMarkdown: string;
  status: 'draft' | 'under_review' | 'approved';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  changesSummary?: string;
  backup?: {
    versionNumber: number;
    blocks: any[];
    compiledMarkdown: string;
    changesSummary: string;
    savedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SectionBlockSchema = new Schema<ISectionBlock>({
  blockId: { type: String, required: true },
  order: { type: Number, required: true },
  type: { type: String, enum: ['heading', 'text', 'table', 'diagram'], required: true },
  markdown: { type: String },
  diagram: {
    mermaidCode: { type: String },
    diagramType: { type: String, enum: ['flowchart', 'sequence', 'er', 'usecase', 'other'] },
    confidence: { type: Number, min: 0, max: 1 },
  },
  userVerified: { type: Boolean, default: false },
  userEditedAt: { type: Date },
  originalAiContent: { type: String },
}, { _id: false });

const SourceOfTruthSchema = new Schema<ISourceOfTruth>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  fileId: { type: Schema.Types.ObjectId, ref: 'File', required: true },
  versionNumber: { type: Number, required: true, default: 1 },
  blocks: [SectionBlockSchema],
  compiledMarkdown: { type: String },
  status: { type: String, enum: ['draft', 'under_review', 'approved'], default: 'draft' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  changesSummary: { type: String },
  backup: {
    versionNumber: { type: Number },
    blocks: [{ type: Schema.Types.Mixed }],
    compiledMarkdown: { type: String },
    changesSummary: { type: String },
    savedAt: { type: Date },
  },
}, { timestamps: true });

export default mongoose.models.SourceOfTruth || mongoose.model<ISourceOfTruth>('SourceOfTruth', SourceOfTruthSchema);
