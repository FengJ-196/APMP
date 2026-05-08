/**
 * MongoDB-backed Project store.
 */
import dbConnect from '../db';
import ProjectModel from './schemas/Project';
import type { Project, CreateProjectInput } from './types';

function mapToProjectType(doc: any): Project {
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
export async function createProject(input: CreateProjectInput): Promise<Project> {
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
export async function findProjectById(id: string): Promise<Project | undefined> {
  await dbConnect();
  const project = await ProjectModel.findById(id).lean();
  if (!project) return undefined;
  return mapToProjectType(project);
}

/**
 * Find all projects belonging to a given user.
 */
export async function findProjectsByUserId(userId: string): Promise<Project[]> {
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
