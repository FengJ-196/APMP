import mongoose, { Schema, Document } from 'mongoose';
import dbConnect from '../db';

export interface IConflict extends Document {
  projectId: mongoose.Types.ObjectId;
  conflictId: string; // "CF-1", "CF-2", etc.
  type: 'Contradiction' | 'Ambiguity' | 'Duplicate';
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  sourceReferences: {
    textSnippets: string[];
    imageIds: string[];
  };
  llmExplanation: string;
  suggestedFix: string;
  resolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
}

const ConflictSchema = new Schema<IConflict>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  conflictId: { type: String, required: true },
  type: { type: String, enum: ['Contradiction', 'Ambiguity', 'Duplicate'], required: true },
  severity: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
  description: { type: String, required: true },
  sourceReferences: {
    textSnippets: [{ type: String }],
    imageIds: [{ type: String }]
  },
  llmExplanation: { type: String, required: true },
  suggestedFix: { type: String, required: true },
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

// Composite index to quickly fetch unresolved conflicts for a project
ConflictSchema.index({ projectId: 1, resolved: 1 });

const ConflictModel = mongoose.models.Conflict || mongoose.model<IConflict>('Conflict', ConflictSchema);
export default ConflictModel;
