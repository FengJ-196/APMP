import mongoose, { Schema, Document } from 'mongoose';
import type { WBSConfigDTO } from '@/dtos';
import dbConnect from '../db';

export interface IWBSConfig extends Document {
  projectId: mongoose.Types.ObjectId;
  techStack: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    cloud: string[];
  };
  teamComposition: string;
  compliance: string[];
  integrations: string[];
  timeline?: {
    expectedDurationMonths?: number;
    sprintLengthWeeks?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WBSConfigSchema = new Schema<IWBSConfig>({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true,
    index: true,
  },
  techStack: {
    languages: [{ type: String }],
    frameworks: [{ type: String }],
    databases: [{ type: String }],
    cloud: [{ type: String }],
  },
  teamComposition: {
    type: String,
    maxlength: 1000,
    default: '',
  },
  compliance: [{ type: String }],
  integrations: [{ type: String }],
  timeline: {
    expectedDurationMonths: { type: Number },
    sprintLengthWeeks: { type: Number },
  },
}, { timestamps: true });

// Force model reload in dev to avoid schema cache conflicts
if (process.env.NODE_ENV === 'development' && mongoose.models.WBSConfig) {
  delete mongoose.models.WBSConfig;
}

const WBSConfigModel = mongoose.models.WBSConfig || mongoose.model<IWBSConfig>('WBSConfig', WBSConfigSchema);
export default WBSConfigModel;

export function mapToWBSConfigDTO(doc: IWBSConfig): WBSConfigDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    techStack: {
      languages: doc.techStack?.languages ?? [],
      frameworks: doc.techStack?.frameworks ?? [],
      databases: doc.techStack?.databases ?? [],
      cloud: doc.techStack?.cloud ?? [],
    },
    teamComposition: doc.teamComposition ?? '',
    compliance: doc.compliance ?? [],
    integrations: doc.integrations ?? [],
    timeline: {
      expectedDurationMonths: doc.timeline?.expectedDurationMonths,
      sprintLengthWeeks: doc.timeline?.sprintLengthWeeks,
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function findWBSConfigByProjectId(projectId: string): Promise<WBSConfigDTO | undefined> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return undefined;
  await dbConnect();
  const doc = await WBSConfigModel.findOne({ projectId }).lean<IWBSConfig>();
  if (!doc) return undefined;
  return mapToWBSConfigDTO(doc);
}

export async function saveWBSConfig(
  projectId: string,
  input: Omit<WBSConfigDTO, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>
): Promise<WBSConfigDTO> {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error('Invalid project ID format');
  }
  await dbConnect();
  
  const doc = await WBSConfigModel.findOneAndUpdate(
    { projectId: new mongoose.Types.ObjectId(projectId) },
    {
      projectId: new mongoose.Types.ObjectId(projectId),
      techStack: input.techStack,
      teamComposition: input.teamComposition ?? '',
      compliance: input.compliance,
      integrations: input.integrations,
      timeline: input.timeline,
    },
    { upsert: true, new: true }
  );

  return mapToWBSConfigDTO(doc);
}
