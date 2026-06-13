import mongoose, { Schema, Document } from 'mongoose';
import dbConnect from '../db';
import type { ProjectDTO, CreateProjectInputDTO } from '@/dtos';

export interface IProject extends Document {
  title: string;
  userId: mongoose.Types.ObjectId;
  status: 'active' | 'archived' | 'completed';
  githubRepo?: string;
  jiraProjectKey?: string;
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
  githubRepo: {
    type: String,
    trim: true,
  },
  jiraProjectKey: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

const ProjectModel = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
export default ProjectModel;

export function mapToProjectType(doc: any): ProjectDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    userId: doc.userId.toString(),
    status: doc.status,
    githubRepo: doc.githubRepo,
    jiraProjectKey: doc.jiraProjectKey,
    createdAt: doc.createdAt,
  };
}

export async function createProject(input: CreateProjectInputDTO): Promise<ProjectDTO> {
  await dbConnect();
  const project = await ProjectModel.create({
    title: input.title,
    userId: input.userId,
    status: input.status ?? 'active',
    githubRepo: input.githubRepo,
    jiraProjectKey: input.jiraProjectKey,
  });
  return mapToProjectType(project);
}

export async function findProjectById(id: string): Promise<ProjectDTO | undefined> {
  await dbConnect();
  const project = await ProjectModel.findById(id).lean<any>();
  if (!project) return undefined;
  return mapToProjectType(project);
}

export async function updateProject(id: string, updates: Partial<IProject>): Promise<ProjectDTO | undefined> {
  await dbConnect();
  const project = await ProjectModel.findByIdAndUpdate(id, updates, { new: true });
  if (!project) return undefined;
  return mapToProjectType(project);
}

export async function findProjectsByUserId(userId: string): Promise<ProjectDTO[]> {
  await dbConnect();
  const projects = await ProjectModel.find({ userId: userId }).lean<any[]>();
  return projects.map(mapToProjectType);
}

export async function clearProjects(): Promise<void> {
  await dbConnect();
  await ProjectModel.deleteMany({});
}
