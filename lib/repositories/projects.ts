/**
 * MongoDB-backed Project store.
 */
import dbConnect from '../db';
import { Project as ProjectModel } from '../models';
import type { ProjectDTO, CreateProjectInputDTO } from '@/dtos';

function mapToProjectType(doc: any): ProjectDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    userId: doc.userId.toString(),
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

/**
 * Create a new project in MongoDB.
 */
export async function createProject(input: CreateProjectInputDTO): Promise<ProjectDTO> {
  await dbConnect();
  const project = await ProjectModel.create({
    title: input.title,
    userId: input.userId,
    status: input.status ?? 'active',
  });
  return mapToProjectType(project);
}

/**
 * Find a single project by its id.
 */
export async function findProjectById(id: string): Promise<ProjectDTO | undefined> {
  await dbConnect();
  const project = await ProjectModel.findById(id).lean();
  if (!project) return undefined;
  return mapToProjectType(project);
}

/**
 * Find all projects belonging to a given user.
 */
export async function findProjectsByUserId(userId: string): Promise<ProjectDTO[]> {
  await dbConnect();
  const projects = await ProjectModel.find({ userId: userId }).lean();
  return projects.map(mapToProjectType);
}

/**
 * Clear all projects. Used in tests.
 */
export async function clearProjects(): Promise<void> {
  await dbConnect();
  await ProjectModel.deleteMany({});
}
