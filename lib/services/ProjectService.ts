import { createProject, findProjectsByUserId, findProjectById, updateProject } from '../models/Project';
import { CreateProjectInputSchema, type ProjectDTO } from '@/dtos';
import { SourceOfTruthService } from './SourceOfTruthService';

export class ProjectService {
  /**
   * Retrieves all projects belonging to a specific user.
   */
  static async getProjectsByUserId(userId: string): Promise<ProjectDTO[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return findProjectsByUserId(userId);
  }

  /**
   * Creates a new project after validating the input data.
   */
  static async createProject(input: unknown): Promise<ProjectDTO> {
    // 1. Validate the incoming data against the Zod schema
    const result = CreateProjectInputSchema.safeParse(input);
    
    if (!result.success) {
      throw new Error(`Invalid project data: ${result.error.message}`);
    }

    const validatedInput = result.data;
    
    // 2. Call the repository to persist the validated data
    const project = await createProject(validatedInput);

    // 3. Create an empty Source of Truth with default content being empty string
    try {
      await SourceOfTruthService.createSourceOfTruth({
        projectId: project.id,
        content: '',
      });
    } catch (err) {
      console.error(`Failed to create empty Source of Truth for project ${project.id}:`, err);
    }

    return project;
  }

  /**
   * Retrieves a single project by its ID.
   */
  static async getProjectById(projectId: string): Promise<ProjectDTO | undefined> {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    return findProjectById(projectId);
  }

  /**
   * Updates an existing project's attributes.
   */
  static async updateProject(projectId: string, input: Partial<any>): Promise<ProjectDTO | undefined> {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    return updateProject(projectId, input);
  }
}
