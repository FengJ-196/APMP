import { create } from 'zustand';
import { projectsApi } from '@/lib/api';

export interface FileMetadata {
  id: string;
  originalName: string;
  contentType: string;
  content?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  status: 'active' | 'archived' | 'completed';
  files: FileMetadata[];
  githubRepo?: string;
  jiraProjectKey?: string;
}

interface ProjectState {
  projectId: string | null;
  project: Project | null;
  loading: boolean;
  error: string | null;
  userId: string | null;
  setProjectId: (id: string) => void;
  fetchProject: (showLoader?: boolean) => Promise<void>;
  updateProjectSettings: (updates: Partial<Project>) => Promise<void>;
  setUserId: (userId: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: null,
  project: null,
  loading: false,
  error: null,
  userId: null,

  setProjectId: (id) => {
    // Only fetch if project ID changed or is first time
    if (get().projectId !== id) {
      set({ projectId: id, project: null });
      get().fetchProject(true);
    }
  },

  setUserId: (userId) => set({ userId }),

  fetchProject: async (showLoader = false) => {
    const { projectId } = get();
    if (!projectId) return;

    if (showLoader) {
      set({ loading: true, error: null });
    }
    try {
      const data = await projectsApi.getById(projectId);
      set({ project: data as any, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch project details', loading: false });
    }
  },

  updateProjectSettings: async (updates) => {
    const { projectId, project } = get();
    if (!projectId || !project) return;

    try {
      const updated = await projectsApi.update(projectId, updates);
      set({ project: { ...project, ...updated } });
    } catch (err: any) {
      set({ error: err.message || 'Failed to update project settings' });
      throw err;
    }
  },
}));
