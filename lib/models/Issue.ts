import mongoose, { Schema, Document } from 'mongoose';
import dbConnect from '../db';
import type { IssueDTO, CreateIssueInputDTO } from '@/dtos';

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

const IssueModel = mongoose.models.Issue || mongoose.model<IIssue>('Issue', IssueSchema);
export default IssueModel;

export function mapToIssueType(doc: IIssue): IssueDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    sourceOfTruthId: doc.sourceOfTruthId.toString(),
    description: doc.description,
    type: doc.type,
    status: doc.status,
    severity: doc.severity,
    suggestion: doc.suggestion,
    clarificationQuestion: doc.clarificationQuestion,
    userNote: doc.userNote,
    sourceReferences: doc.sourceReferences,
    resolvedBy: doc.resolvedBy?.toString(),
    resolvedAt: doc.resolvedAt,
    createdAt: doc.createdAt,
  };
}

export async function createIssue(input: CreateIssueInputDTO): Promise<IssueDTO> {
  await dbConnect();
  const issue = await IssueModel.create(input);
  return mapToIssueType(issue);
}

export async function findIssueById(id: string): Promise<IssueDTO | undefined> {
  await dbConnect();
  const issue = await IssueModel.findById(id).lean<IIssue>();
  if (!issue) return undefined;
  return mapToIssueType(issue);
}

export async function findIssuesByProjectId(projectId: string): Promise<IssueDTO[]> {
  await dbConnect();
  const issues = await IssueModel.find({ projectId }).lean<IIssue[]>();
  return issues.map(mapToIssueType);
}

export async function deleteIssue(id: string): Promise<boolean> {
  await dbConnect();
  const result = await IssueModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
}
