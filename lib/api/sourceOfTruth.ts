import { fetchClient } from './client';
import type { SourceOfTruthDTO } from '@/dtos';

export const sourceOfTruthApi = {
  /**
   * Get the source of truth for a specific project.
   */
  getByProjectId: (projectId: string, includeHistoryContent: boolean = false) => 
    fetchClient<SourceOfTruthDTO>(`/api/projects/${projectId}/source-of-truth?includeHistoryContent=${includeHistoryContent}`),

  /**
   * Create a source of truth for a project.
   */
  create: (projectId: string, content: string = '') => 
    fetchClient<SourceOfTruthDTO>(`/api/projects/${projectId}/source-of-truth`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  /**
   * Update the source of truth for a project.
   */
  update: (projectId: string, content: string) => 
    fetchClient<SourceOfTruthDTO>(`/api/projects/${projectId}/source-of-truth`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
};
