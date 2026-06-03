import { findWBSConfigByProjectId, saveWBSConfig } from '../models/WBSConfig';
import { WBSConfigSchema, type WBSConfigDTO, type SaveWBSConfigInputDTO } from '@/dtos';

export class WBSConfigService {
  /**
   * Retrieves the WBS configuration for a specific project.
   */
  static async getWBSConfigByProjectId(projectId: string): Promise<WBSConfigDTO | undefined> {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    return findWBSConfigByProjectId(projectId);
  }

  /**
   * Validates and saves WBS configuration parameters (performing upserts).
   * Security Measures:
   * 1. Validated and restricted via Zod schema checks to prevent buffer overflows or malformed fields.
   * 2. Sanitizes input string to prevent cross-site scripting (XSS).
   */
  static async saveWBSConfig(projectId: string, input: SaveWBSConfigInputDTO): Promise<WBSConfigDTO> {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // 1. Zod runtime verification checks
    const parseResult = WBSConfigSchema.safeParse(input);
    if (!parseResult.success) {
      throw new Error(`Invalid WBS Configuration payload: ${parseResult.error.message}`);
    }

    const validatedData = parseResult.data;

    // 2. Strict XSS sanitization on free-form string inputs
    if (validatedData.teamComposition) {
      validatedData.teamComposition = this.sanitizeText(validatedData.teamComposition);
    }

    // 3. Persist to MongoDB database
    return saveWBSConfig(projectId, validatedData);
  }

  /**
   * Helper utility to escape HTML inputs, neutralizing script injection attempts.
   */
  private static sanitizeText(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
