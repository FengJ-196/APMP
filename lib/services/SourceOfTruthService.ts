import { 
  createSourceOfTruth, 
  findSourceOfTruthById, 
  findSourceOfTruthByProjectId, 
  updateSourceOfTruth,
  type CreateSourceOfTruthInput,
  type UpdateResult
} from '../models/SourceOfTruth';
import type { SourceOfTruthDTO } from '@/dtos';

export class SourceOfTruthService {
  /**
   * Retrieves a Source of Truth by its ID.
   */
  static async getSourceOfTruthById(id: string): Promise<SourceOfTruthDTO | undefined> {
    if (!id) {
      throw new Error('Source of Truth ID is required');
    }
    return findSourceOfTruthById(id);
  }

  /**
   * Retrieves a Source of Truth belonging to a specific project.
   */
  static async getSourceOfTruthByProjectId(projectId: string, includeHistoryContent: boolean = true): Promise<SourceOfTruthDTO | undefined> {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    return findSourceOfTruthByProjectId(projectId, includeHistoryContent);
  }

  /**
   * Creates a new Source of Truth for a project.
   */
  static async createSourceOfTruth(input: CreateSourceOfTruthInput): Promise<SourceOfTruthDTO> {
    if (!input || !input.projectId) {
      throw new Error('Project ID is required');
    }
    
    // Call the repository to persist the data
    return createSourceOfTruth(input);
  }

  /**
   * Updates the content of a Source of Truth.
   * This automatically handles versioning internally.
   */
  static async updateSourceOfTruth(id: string, content: string): Promise<UpdateResult> {
    if (!id) {
      throw new Error('Source of Truth ID is required');
    }
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }
    
    return updateSourceOfTruth(id, content);
  }
}
