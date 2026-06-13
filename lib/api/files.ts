import { fetchClient } from './client';
import type { FileDTO } from '@/dtos';

export const filesApi = {
  /**
   * Get all uploaded files for a project.
   */
  getByProjectId: (projectId: string) =>
    fetchClient<FileDTO[]>(`/api/files?projectId=${projectId}`, { method: 'GET' }),
    
  /**
   * Get a single file by its ID.
   */
  getById: (id: string) =>
    fetchClient<FileDTO>(`/api/files/${id}?metadata=true`, { method: 'GET' }),

  /**
   * Upload a new physical file using FormData.
   */
  upload: (projectId: string, userId: string, file: File) => {
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('userId', userId);
    formData.append('file', file); // Native browser File object

    return fetchClient<FileDTO>('/api/files/upload', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Delete a file.
   */
  delete: (id: string) =>
    fetchClient<{ success: boolean }>(`/api/files/${id}`, { method: 'DELETE' }),

  /**
   * Extract images and text from a PDF file.
   */
  extractPdf: (id: string) =>
    fetchClient<{ success: boolean; message: string }>(`/api/files/${id}/extract`, { method: 'POST' }),

  /**
   * Update text/markdown file content.
   */
  updateContent: (id: string, content: string) =>
    fetchClient<FileDTO>(`/api/files/${id}/content`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  /**
   * Rename a file.
   */
  rename: (id: string, name: string) =>
    fetchClient<FileDTO>(`/api/files/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
};

