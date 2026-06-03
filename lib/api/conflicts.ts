import { fetchClient } from './client';
import type { ConflictReport } from '@/lib/ai/types';

export interface ConflictReportWithDb extends ConflictReport {
  dbId?: string;
}

export const conflictsApi = {
  /**
   * Run logical conflict and ambiguity analysis for a specific project (streams JSON and persists).
   */
  analyze: (projectId: string) =>
    fetchClient<ConflictReportWithDb[]>(`/api/projects/${projectId}/conflicts`, {
      method: 'POST',
    }),

  /**
   * Get existing unresolved conflicts for a project from the database.
   */
  getConflicts: (projectId: string) =>
    fetchClient<ConflictReportWithDb[]>(`/api/projects/${projectId}/conflicts`, {
      method: 'GET',
    }),

  /**
   * Mark a specific conflict as resolved (solved) in the database.
   */
  resolve: (projectId: string, conflictId: string) =>
    fetchClient<{ success: boolean }>(`/api/projects/${projectId}/conflicts`, {
      method: 'PATCH',
      body: JSON.stringify({ conflictId }),
    }),
};
