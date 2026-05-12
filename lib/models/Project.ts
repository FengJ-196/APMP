import mongoose, { Schema, Document } from 'mongoose';
import dbConnect from '../db';
import type { ProjectDTO, CreateProjectInputDTO } from '@/dtos';

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

const ProjectModel = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
export default ProjectModel;

export function mapToProjectType(doc: IProject): ProjectDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    userId: doc.userId.toString(),
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

export async function createProject(input: CreateProjectInputDTO): Promise<ProjectDTO> {
  await dbConnect();
  const project = await ProjectModel.create({
    title: input.title,
    userId: input.userId,
    status: input.status ?? 'active',
  });
  return mapToProjectType(project);
}

export async function findProjectById(id: string): Promise<ProjectDTO | undefined> {
  await dbConnect();
  const project = await ProjectModel.findById(id).lean<IProject>();
  if (!project) return undefined;
  return mapToProjectType(project);
}

export async function findProjectsByUserId(userId: string): Promise<ProjectDTO[]> {
  await dbConnect();
  const projects = await ProjectModel.find({ userId: userId }).lean<IProject[]>();
  return projects.map(mapToProjectType);
}

export async function clearProjects(): Promise<void> {
  await dbConnect();
  await ProjectModel.deleteMany({});
}
