import { fetchClient } from './client';

export interface IntegrationStatus {
  github: {
    connected: boolean;
    authType: 'oauth' | 'basic' | null;
  };
  jira: {
    connected: boolean;
    authType: 'oauth' | 'basic' | null;
    domain: string | null;
    email: string | null;
  };
}

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export const integrationsApi = {
  getStatus: () =>
    fetchClient<IntegrationStatus>('/api/integrations', { method: 'GET' }),
    
  saveManual: (data: { platform: 'github' | 'jira'; apiToken: string; email?: string; domain?: string }) =>
    fetchClient<{ success: boolean; message: string }>('/api/integrations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  disconnect: (platform: 'github' | 'jira') =>
    fetchClient<{ success: boolean }>(`/api/integrations?platform=${platform}`, {
      method: 'DELETE',
    }),
    
  getGithubRepos: () =>
    fetchClient<GithubRepo[]>('/api/github/repos', { method: 'GET' }),
    
  getJiraProjects: () =>
    fetchClient<JiraProject[]>('/api/jira/projects', { method: 'GET' }),
};
