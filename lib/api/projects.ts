import { fetchClient } from './client';
import type { ProjectDTO, CreateProjectInputDTO } from '@/dtos';

export const projectsApi = {
  /**
   * Get all projects for a specific user.
   */
  getAll: (userId: string) => 
    fetchClient<ProjectDTO[]>(`/api/projects/all?userId=${userId}`, { method: 'GET' }),

  /**
   * Get a single project by its ID.
   */
  getById: (id: string) => 
    fetchClient<ProjectDTO>(`/api/projects/${id}`, { method: 'GET' }),

  /**
   * Create a new project.
   */
  create: (data: CreateProjectInputDTO) => 
    fetchClient<ProjectDTO>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing project's fields.
   */
  update: (id: string, data: Partial<ProjectDTO>) => 
    fetchClient<ProjectDTO>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * Get WBS Configuration for a project.
   */
  getWBSConfig: (projectId: string) => 
    fetchClient<any>(`/api/projects/${projectId}/wbs/config`, { method: 'GET' }),

  /**
   * Save/Update WBS Configuration for a project.
   */
  saveWBSConfig: (projectId: string, data: any) => 
    fetchClient<any>(`/api/projects/${projectId}/wbs/config`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
