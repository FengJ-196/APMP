import { createProject, findProjectsByUserId, findProjectById } from '../repositories/projects';
import { CreateProjectInputSchema, type ProjectDTO } from '@/dtos';

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
    return createProject(validatedInput);
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
}
