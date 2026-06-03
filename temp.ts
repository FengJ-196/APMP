import mongoose, { Schema, Document } from 'mongoose';

// --- User Schema ---
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: [true, 'Please provide a password'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// --- Project Schema ---
export interface IProject extends Document {
  title: string;
  userId: mongoose.Types.ObjectId;
  status: 'active' | 'archived' | 'completed';
  createdAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  title: {
    type: String,
    required: [true, 'Please provide a project title'],
    trim: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'completed'],
    default: 'active',
  },
}, { timestamps: true });

// --- File Schema ---
export interface IFile extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  originalName: string;
  contentType: string;
  fileData: Buffer;
  content?: string;
  createdAt: Date;
}

const FileSchema = new Schema<IFile>({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
    enum: {
      values: ['image/png', 'image/jpeg', 'text/markdown', 'application/pdf'],
      message: '{VALUE} is not a supported file type',
    },
  },
  fileData: {
    type: Buffer,
    required: true,
  },
  content: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// --- Source Of Truth Schema ---
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
}

const VersionSnapshotSchema = new Schema<IVersionSnapshot>(
    {
        versionNumber: { type: Number, required: true },
        content: { type: String, required: true },
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

// --- Issue Schema ---
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
  sourceReferences: string[];
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

// --- WBS Item Schema ---
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
  sourceRequirements: string[];
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

// --- Estimation & External Sync Schemas ---
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
