import mongoose, { Schema, Document } from 'mongoose';

export interface IIssue extends Document {
  projectId: mongoose.Types.ObjectId;
  sourceOfTruthId: mongoose.Types.ObjectId;
  description: string;
  type: 'Contradiction' | 'Ambiguity' | 'Duplicate' | 'MissingInfo';
  status: 'new' | 'verified' | 'rejected' | 'resolved';
  severity: 'High' | 'Medium' | 'Low';
  suggestion?: string;
  clarificationQuestion?: string;
  userNote?: string;
  sourceReferences: string[]; // blockId[]
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
}

const IssueSchema = new Schema<IIssue>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  sourceOfTruthId: { type: Schema.Types.ObjectId, ref: 'SourceOfTruth', required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Contradiction', 'Ambiguity', 'Duplicate', 'MissingInfo'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['new', 'verified', 'rejected', 'resolved'], 
    default: 'new' 
  },
  severity: { 
    type: String, 
    enum: ['High', 'Medium', 'Low'], 
    required: true 
  },
  suggestion: { type: String },
  clarificationQuestion: { type: String },
  userNote: { type: String },
  sourceReferences: [{ type: String }],
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

IssueSchema.index({ projectId: 1, status: 1 });

export default mongoose.models.Issue || mongoose.model<IIssue>('Issue', IssueSchema);
