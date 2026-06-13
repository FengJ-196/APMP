'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Sparkles, 
  Loader2, 
  Check, 
  Plus, 
  ListTodo, 
  Play, 
  FileText,
  AlertCircle,
  X,
  Settings,
  Link2,
  AlertTriangle
} from 'lucide-react';
import { projectsApi, integrationsApi } from '@/lib/api';

// Custom inline SVG icons because Lucide 1.0+ removed brand icons
function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function TrelloIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <rect width="3" height="9" x="7" y="7" rx="1" />
      <rect width="3" height="5" x="14" y="7" rx="1" />
    </svg>
  );
}

interface WBSItem {
  id: string;
  projectId: string;
  parentId?: string;
  sourceOfTruthId?: string;
  title: string;
  description?: string;
  type: 'epic' | 'feature' | 'story' | 'task' | 'subtask';
  status: 'ai_generated' | 'reviewed' | 'approved' | 'rejected';
  methodology?: 'scrum' | 'kanban' | 'waterfall';
  acceptanceCriteria: string[];
  sourceRequirements: string[];
  order: number;
  aiGenerated: boolean;
}

export default function WBSPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<WBSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [breakingTaskId, setBreakingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  
  // Sync inputs
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [isJiraOAuth, setIsJiraOAuth] = useState(false);
  const [isGitHubOAuth, setIsGitHubOAuth] = useState(false);
  const [showManualSyncOverride, setShowManualSyncOverride] = useState(false);

  // Sync statuses per item
  const [syncStates, setSyncStates] = useState<Record<string, { type: 'github' | 'jira'; status: 'syncing' | 'success' | 'error'; message?: string }>>({});

  // RAG Story Point Estimation states
  const [estimates, setEstimates] = useState<Record<string, any>>({});
  const [estimatingIds, setEstimatingIds] = useState<Record<string, boolean>>({});
  const [expandedEstimateIds, setExpandedEstimateIds] = useState<Record<string, boolean>>({});
  const [estimatingAll, setEstimatingAll] = useState(false);

  useEffect(() => {
    fetchWBS();
    loadIntegrationSettings();
  }, [projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const syncStatus = params.get('sync');
      if (syncStatus === 'github-success') {
        setSuccessMessage('GitHub integration connected successfully!');
        loadIntegrationSettings();
        const url = new URL(window.location.href);
        url.searchParams.delete('sync');
        window.history.replaceState({}, '', url.pathname + url.search);
      } else if (syncStatus === 'jira-success') {
        setSuccessMessage('Jira integration connected successfully!');
        loadIntegrationSettings();
        const url = new URL(window.location.href);
        url.searchParams.delete('sync');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  }, []);

  const loadIntegrationSettings = async () => {
    try {
      const project = await projectsApi.getById(projectId);
      if (project) {
        if (project.githubRepo) {
          const parts = project.githubRepo.split('/');
          if (parts.length === 2) {
            setGhOwner(parts[0]);
            setGhRepo(parts[1]);
          } else {
            setGhRepo(project.githubRepo);
          }
        } else {
          setGhOwner('');
          setGhRepo('');
        }
        if (project.jiraProjectKey) {
          setJiraProjectKey(project.jiraProjectKey);
        } else {
          setJiraProjectKey('');
        }
      }

      const intStatus = await integrationsApi.getStatus();
      if (intStatus) {
        setIsGitHubOAuth(intStatus.github?.connected && intStatus.github.authType === 'oauth');
        setIsJiraOAuth(intStatus.jira?.connected && intStatus.jira.authType === 'oauth');
        
        if (intStatus.jira?.connected) {
          if (intStatus.jira.domain) setJiraDomain(intStatus.jira.domain);
          if (intStatus.jira.email) setJiraEmail(intStatus.jira.email);
        }
      }
    } catch (err) {
      console.error('Failed to load integration settings', err);
    }
  };

  const fetchEstimates = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/estimates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const estMap: Record<string, any> = {};
        data.forEach((est: any) => {
          estMap[est.wbsItemId] = est;
        });
        setEstimates(estMap);
      }
    } catch (err) {
      console.error('Failed to load story point estimates:', err);
    }
  };

  const fetchWBS = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/wbs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!res.ok) throw new Error('Failed to load WBS items.');
      const data = await res.json();
      setItems(data);
      
      // Load story point estimates concurrently
      await fetchEstimates();
      
      // Auto-expand epics and stories on first load
      const initialExpanded: Record<string, boolean> = {};
      data.forEach((item: WBSItem) => {
        if (item.type === 'epic' || item.type === 'story') {
          initialExpanded[item.id] = true;
        }
      });
      setExpandedIds(initialExpanded);
    } catch (err: any) {
      console.error(err);
      setError('Could not fetch WBS items.');
    } finally {
      setLoading(false);
    }
  };

  const handleEstimateStoryPoints = async (wbsItemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setEstimatingIds(prev => ({ ...prev, [wbsItemId]: true }));
      setError(null);

      let userId: string | undefined;
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId || payload.id;
        }
      } catch (err) {
        console.warn('Could not parse userId from token:', err);
      }

      const res = await fetch(`/api/wbs/${wbsItemId}/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to estimate story points.');
      }

      const estimation = await res.json();
      
      // Update states
      setEstimates(prev => ({ ...prev, [wbsItemId]: estimation }));
      setExpandedEstimateIds(prev => ({ ...prev, [wbsItemId]: true }));
      setExpandedIds(prev => ({ ...prev, [wbsItemId]: true })); // ensure task card is open
      
      setSuccessMessage('Story points estimated successfully using RAG!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to estimate story points.');
    } finally {
      setEstimatingIds(prev => ({ ...prev, [wbsItemId]: false }));
    }
  };

  const handleUpdateStoryPoints = async (wbsItemId: string, finalPoints: number) => {
    try {
      // Optimistic state update
      setEstimates(prev => {
        const current = prev[wbsItemId];
        if (current) {
          return { ...prev, [wbsItemId]: { ...current, finalPoints } };
         }
         return prev;
      });

      let userId: string | undefined;
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId || payload.id;
        }
      } catch {}

      const res = await fetch(`/api/wbs/${wbsItemId}/estimate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ finalPoints, userId }),
      });

      if (!res.ok) {
        throw new Error('Failed to save manual override.');
      }

      const updated = await res.json();
      setEstimates(prev => ({ ...prev, [wbsItemId]: updated }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update final story points.');
    }
  };

  const handleEstimateAllStoryPoints = async () => {
    try {
      setEstimatingAll(true);
      setError(null);

      let userId: string | undefined;
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId || payload.id;
        }
      } catch (err) {
        console.warn('Could not parse userId from token:', err);
      }

      const res = await fetch(`/api/projects/${projectId}/wbs/estimate-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to estimate story points for all tasks.');
      }

      const newEstimates = await res.json();
      
      // Update estimates state with all returned estimations
      setEstimates(prev => {
        const updated = { ...prev };
        newEstimates.forEach((est: any) => {
          updated[est.wbsItemId] = est;
        });
        return updated;
      });
      
      setSuccessMessage(`Successfully estimated ${newEstimates.length} tasks/stories using RAG!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to perform bulk story point estimation.');
    } finally {
      setEstimatingAll(false);
    }
  };

  const handleGenerateWBS = async () => {
    try {
      setGenerating(true);
      setError(null);
      setStreamingText('');
      const res = await fetch(`/api/projects/${projectId}/wbs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to generate WBS.');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Response stream is unavailable');

      const decoder = new TextDecoder();
      let runningText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        runningText += chunk;
        setStreamingText(runningText);
      }

      // Re-fetch items from database
      await fetchWBS();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to decompose Source of Truth to WBS.');
    } finally {
      setGenerating(false);
    }
  };

  const handleBreakdownTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setBreakingTaskId(taskId);
      setError(null);
      const res = await fetch(`/api/wbs/${taskId}/breakdown`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!res.ok) {
        const errText = await res.json();
        throw new Error(errText.error || 'Failed to breakdown task.');
      }
      // Re-fetch all items to show newly added subtasks
      const fetchRes = await fetch(`/api/projects/${projectId}/wbs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await fetchRes.json();
      setItems(data);
      
      // Ensure the task is expanded to show new subtasks
      setExpandedIds(prev => ({ ...prev, [taskId]: true }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to run task breakdown.');
    } finally {
      setBreakingTaskId(null);
    }
  };

  const handleConnectGitHub = async () => {
    try {
      const res = await fetch(`/api/github/authorize?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to initiate GitHub authentication');
      }
      const { authorizeUrl } = await res.json();
      window.location.href = authorizeUrl;
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConnectJira = async () => {
    try {
      const res = await fetch(`/api/jira/authorize?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to initiate Jira authentication');
      }
      const { authorizeUrl } = await res.json();
      window.location.href = authorizeUrl;
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportGitHub = async (wbsItemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ghOwner || !ghRepo) {
      alert('Please connect GitHub and select a repository in the Integrations panel first.');
      return;
    }
    try {
      setSyncStates(prev => ({ ...prev, [`${wbsItemId}-github`]: { type: 'github', status: 'syncing' } }));
      const res = await fetch('/api/github/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ wbsItemId, owner: ghOwner, repo: ghRepo }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'GitHub Export failed.');
      }
      setSyncStates(prev => ({ ...prev, [`${wbsItemId}-github`]: { type: 'github', status: 'success' } }));
      setTimeout(() => {
        setSyncStates(prev => {
          const next = { ...prev };
          delete next[`${wbsItemId}-github`];
          return next;
        });
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setSyncStates(prev => ({ 
        ...prev, 
        [`${wbsItemId}-github`]: { type: 'github', status: 'error', message: err.message } 
      }));
    }
  };

  const handleExportJira = async (wbsItemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!jiraProjectKey) {
      alert('Please connect Jira and select a project key in the Integrations panel first.');
      return;
    }
    try {
      setSyncStates(prev => ({ ...prev, [`${wbsItemId}-jira`]: { type: 'jira', status: 'syncing' } }));
      const exportBody: any = { wbsItemId, projectKey: jiraProjectKey };
      
      // Only send manual credentials if NOT using OAuth
      if (!isJiraOAuth) {
        exportBody.email = jiraEmail;
        exportBody.domain = jiraDomain;
        exportBody.apiToken = jiraToken;
      }

      const res = await fetch('/api/jira/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(exportBody),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Jira Export failed.');
      }
      setSyncStates(prev => ({ ...prev, [`${wbsItemId}-jira`]: { type: 'jira', status: 'success' } }));
      setTimeout(() => {
        setSyncStates(prev => {
          const next = { ...prev };
          delete next[`${wbsItemId}-jira`];
          return next;
        });
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setSyncStates(prev => ({ 
        ...prev, 
        [`${wbsItemId}-jira`]: { type: 'jira', status: 'error', message: err.message } 
      }));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Group items by hierarchy
  const epics = items.filter(i => i.type === 'epic');
  const getStoriesForEpic = (epicId: string) => items.filter(i => i.type === 'story' && i.parentId === epicId);
  const getTasksForStory = (storyId: string) => items.filter(i => i.type === 'task' && i.parentId === storyId);
  const getSubtasksForTask = (taskId: string) => items.filter(i => i.type === 'subtask' && i.parentId === taskId);

  return (
    <div className="mt-12 bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="p-6 border-b border-border-subtle bg-bg-elevated flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-subtle rounded-lg">
            <ListTodo className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Work Breakdown Structure (WBS)</h2>
            <p className="text-xs text-text-tertiary mt-1">
              Decompose your Source of Truth requirements spec into hierarchical Epics, Stories, and Tasks
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 self-end lg:self-auto">
          {items.length > 0 && (
            <button
              onClick={handleEstimateAllStoryPoints}
              disabled={estimatingAll || generating || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-bg-surface hover:bg-bg-overlay text-text-primary text-xs font-bold border border-border-subtle hover:border-accent-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              title="Run RAG story point estimation for all tasks/stories in this project"
            >
              {estimatingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
                  <span>Estimating all tasks...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-accent-primary animate-pulse" />
                  <span>Estimate All Tasks (RAG)</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleGenerateWBS}
            disabled={generating || loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-accent-primary to-accent-hover text-white font-semibold hover:shadow-lg hover:shadow-accent-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-xs"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Decomposing Requirements...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 animate-pulse" />
                Generate WBS Tree
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync Configurations Display & Override block */}
      <div className="px-6 py-4 bg-bg-base/30 border-b border-border-subtle flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GitHub configuration status */}
          <div className="p-3 bg-bg-elevated/40 rounded-xl border border-border-subtle/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-bg-base text-text-primary">
                <GithubIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">GitHub Sync Target</span>
                {ghOwner && ghRepo ? (
                  <span className="text-xs font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                    <span className="truncate max-w-[200px]" title={`${ghOwner}/${ghRepo}`}>{ghOwner}/{ghRepo}</span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-status-error flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>No repository linked</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Jira configuration status */}
          <div className="p-3 bg-bg-elevated/40 rounded-xl border border-border-subtle/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-bg-base text-blue-400">
                <TrelloIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">Jira Sync Target</span>
                {jiraProjectKey ? (
                  <span className="text-xs font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                    <span>Project Key: <strong>{jiraProjectKey}</strong></span>
                    {jiraDomain && <span className="text-[10px] text-text-tertiary truncate max-w-[120px]">({jiraDomain})</span>}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-status-error flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>No project linked</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Option to show manual config override forms */}
        <div className="border-t border-border-subtle/40 pt-3">
          <button
            onClick={() => setShowManualSyncOverride(!showManualSyncOverride)}
            className="text-[10px] text-text-tertiary hover:text-accent-primary font-bold flex items-center gap-1 focus:outline-none cursor-pointer"
          >
            <Settings className="w-3 h-3" />
            <span>{showManualSyncOverride ? 'Hide Advanced Credentials Override' : 'Show Advanced Credentials Override'}</span>
          </button>

          {showManualSyncOverride && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3 p-3 bg-bg-base/50 rounded-xl border border-border-subtle/30 animate-fade-in-up">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase">GitHub Override</span>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="Owner" 
                    value={ghOwner} 
                    onChange={e => setGhOwner(e.target.value)}
                    className="text-xs p-1.5 bg-bg-base border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" 
                  />
                  <input 
                    type="text" 
                    placeholder="Repo" 
                    value={ghRepo} 
                    onChange={e => setGhRepo(e.target.value)}
                    className="text-xs p-1.5 bg-bg-base border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" 
                  />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase">Jira Override (Basic Auth credentials)</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input 
                    type="text" 
                    placeholder="Proj Key" 
                    value={jiraProjectKey} 
                    onChange={e => setJiraProjectKey(e.target.value)}
                    className="text-xs p-1.5 bg-bg-base border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" 
                  />
                  <input 
                    type="text" 
                    placeholder="Jira Email" 
                    value={jiraEmail} 
                    onChange={e => setJiraEmail(e.target.value)}
                    className="text-xs p-1.5 bg-bg-base border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" 
                  />
                  <input 
                    type="text" 
                    placeholder="Jira Domain" 
                    value={jiraDomain} 
                    onChange={e => setJiraDomain(e.target.value)}
                    className="text-xs p-1.5 bg-bg-base border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" 
                  />
                  <input 
                    type="password" 
                    placeholder="Jira Token" 
                    value={jiraToken} 
                    onChange={e => setJiraToken(e.target.value)}
                    className="text-xs p-1.5 bg-bg-base border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-status-error-glow text-status-error text-sm font-medium border-b border-status-error/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-accent-subtle text-accent-primary text-sm font-medium border-b border-accent-primary/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-accent-primary" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-text-tertiary hover:text-text-secondary cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tree List */}
      <div className="p-6 bg-bg-base/10 min-h-[200px]">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
          </div>
        )}

        {generating && (
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center w-full bg-bg-surface border border-border-subtle rounded-xl p-6 mb-6">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-accent-glow border-t-accent-primary animate-spin" />
              <Sparkles className="w-6 h-6 text-accent-primary animate-pulse" />
            </div>
            <div>
              <p className="text-text-primary font-bold animate-pulse">Running Agile WBS Decomposer...</p>
              <p className="text-text-tertiary text-xs mt-1">Generating Epics, Stories, Tasks, and Criteria matching tech-stack constraints</p>
            </div>
            {streamingText && (
              <div className="w-full max-w-3xl mt-4 text-left bg-bg-base/80 p-4 rounded-xl border border-border-subtle font-mono text-xs text-text-secondary h-64 overflow-y-auto shadow-inner animate-fade-in-up">
                <div className="text-[10px] font-bold text-accent-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-ping" />
                  Live AI Reasoner stream
                </div>
                <pre className="whitespace-pre-wrap font-mono leading-relaxed">{streamingText}</pre>
              </div>
            )}
          </div>
        )}

        {!loading && !generating && epics.length === 0 && (
          <div className="text-center py-12 text-text-tertiary">
            <FileText className="w-12 h-12 text-text-tertiary/20 mx-auto mb-3" />
            <p className="font-semibold text-text-secondary">WBS Structure is empty</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">Click "Generate WBS Tree" to run the requirements decomposition and populate the agile breakdown.</p>
          </div>
        )}

        {/* Epics rendering */}
        {!generating && (
          <div className="space-y-6">
          {epics.map(epic => {
            const isEpicExpanded = expandedIds[epic.id];
            const epicStories = getStoriesForEpic(epic.id);
            
            return (
              <div key={epic.id} className="border border-border-subtle rounded-xl overflow-hidden bg-bg-surface">
                {/* Epic Node Row */}
                <div 
                  onClick={() => toggleExpand(epic.id)}
                  className="p-4 bg-bg-elevated/30 hover:bg-bg-elevated/50 flex items-center justify-between cursor-pointer select-none transition-colors border-b border-border-subtle/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded bg-accent-subtle/50 text-accent-primary">
                      {isEpicExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-accent-primary uppercase tracking-widest bg-accent-subtle px-2 py-0.5 rounded">Epic</span>
                      <h3 className="font-bold text-text-primary text-base mt-1.5">{epic.title}</h3>
                      {epic.description && <p className="text-xs text-text-secondary mt-1 max-w-2xl">{epic.description}</p>}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-text-tertiary font-bold bg-bg-base border border-border-subtle px-2 py-0.5 rounded">
                    {epicStories.length} Stories
                  </span>
                </div>

                {/* Epic content (Stories) */}
                {isEpicExpanded && (
                  <div className="p-4 bg-bg-surface/50 space-y-4 border-t border-border-subtle/20">
                    {epicStories.map(story => {
                      const isStoryExpanded = expandedIds[story.id];
                      const storyTasks = getTasksForStory(story.id);
                      
                      return (
                        <div key={story.id} className="border border-border-subtle/80 rounded-xl overflow-hidden bg-bg-elevated/10">
                          {/* Story Node Row */}
                          <div 
                            onClick={() => toggleExpand(story.id)}
                            className="p-3.5 bg-bg-elevated/20 hover:bg-bg-elevated/30 flex items-center justify-between cursor-pointer select-none transition-colors border-b border-border-subtle/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-1 rounded bg-bg-base text-text-secondary">
                                {isStoryExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/10">User Story</span>
                                <h4 className="font-semibold text-text-primary text-sm mt-1">{story.title}</h4>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-text-tertiary font-semibold bg-bg-base border border-border-subtle px-1.5 py-0.5 rounded">
                              {storyTasks.length} Tasks
                            </span>
                          </div>

                          {/* Story content (Tasks) */}
                          {isStoryExpanded && (
                            <div className="p-4 bg-bg-base/10 space-y-3">
                              {storyTasks.map(task => {
                                const isTaskExpanded = expandedIds[task.id];
                                const taskSubtasks = getSubtasksForTask(task.id);
                                
                                const ghState = syncStates[`${task.id}-github`];
                                const jiraState = syncStates[`${task.id}-jira`];

                                return (
                                  <div key={task.id} className="border border-border-subtle/50 rounded-xl overflow-hidden bg-bg-surface shadow-sm">
                                    {/* Task Node Row */}
                                    <div 
                                      onClick={() => toggleExpand(task.id)}
                                      className="p-3.5 hover:bg-bg-elevated/20 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none transition-colors"
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="p-1 rounded bg-bg-elevated text-text-tertiary mt-0.5">
                                          {isTaskExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/15">Task</span>
                                            {task.methodology && (
                                              <span className="text-[8px] font-mono text-text-tertiary bg-bg-elevated px-1.5 py-0.5 rounded capitalize">{task.methodology}</span>
                                            )}
                                          </div>
                                          <h5 className="font-bold text-text-primary text-xs mt-1">{task.title}</h5>
                                          {task.description && <p className="text-[11px] text-text-secondary mt-1">{task.description}</p>}
                                          
                                          {/* Acceptance criteria in preview */}
                                          {task.acceptanceCriteria.length > 0 && (
                                            <div className="mt-2 pl-2 border-l border-border-subtle">
                                              <span className="text-[9px] font-bold uppercase text-text-tertiary tracking-wider block mb-0.5">Acceptance Criteria ({task.acceptanceCriteria.length})</span>
                                              <ul className="list-disc pl-3 text-[10px] text-text-tertiary space-y-0.5">
                                                {task.acceptanceCriteria.slice(0, 2).map((ac, idx) => (
                                                  <li key={idx} className="truncate max-w-md">{ac}</li>
                                                ))}
                                                {task.acceptanceCriteria.length > 2 && <li className="italic">+{task.acceptanceCriteria.length - 2} more...</li>}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Task Actions */}
                                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center" onClick={e => e.stopPropagation()}>
                                        {/* RAG Story Point Estimate Trigger / Badge */}
                                        {(task.type === 'task' || task.type === 'story') && (
                                          <>
                                            {estimates[task.id] ? (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setExpandedEstimateIds(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                                                  setExpandedIds(prev => ({ ...prev, [task.id]: true })); // ensure task card is open
                                                }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                                                  expandedEstimateIds[task.id]
                                                    ? 'bg-accent-primary text-white border-accent-primary shadow-sm shadow-accent-primary/20'
                                                    : 'bg-accent-subtle hover:bg-accent-primary hover:text-white text-accent-primary border-accent-primary/20 hover:border-accent-primary transition-all'
                                                }`}
                                                title="View RAG Estimate details"
                                              >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>{estimates[task.id].finalPoints ?? estimates[task.id].aiSuggestedPoints} SP</span>
                                              </button>
                                            ) : (
                                              <button
                                                onClick={(e) => handleEstimateStoryPoints(task.id, e)}
                                                disabled={estimatingIds[task.id]}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-bg-elevated hover:bg-bg-overlay text-text-secondary hover:text-text-primary text-[11px] font-semibold border border-border-subtle hover:border-border-focus transition-all disabled:opacity-40"
                                                title="Estimate story points using Qdrant RAG + Gemini"
                                              >
                                                {estimatingIds[task.id] ? (
                                                  <>
                                                    <Loader2 className="w-3 h-3 animate-spin text-accent-primary" />
                                                    <span>Estimating...</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Sparkles className="w-3 h-3 text-accent-primary animate-pulse" />
                                                    <span>Estimate (RAG)</span>
                                                  </>
                                                )}
                                              </button>
                                            )}
                                          </>
                                        )}

                                        {/* Breakdown to subtasks */}
                                        <button
                                          onClick={(e) => handleBreakdownTask(task.id, e)}
                                          disabled={breakingTaskId === task.id}
                                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-subtle hover:bg-accent-primary text-accent-primary hover:text-white text-[11px] font-semibold border border-accent-primary/20 hover:border-accent-primary transition-all disabled:opacity-40"
                                        >
                                          {breakingTaskId === task.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Play className="w-3 h-3" />
                                          )}
                                          <span>Subtasks</span>
                                        </button>

                                        {/* GitHub Sync */}
                                        <button
                                          onClick={(e) => handleExportGitHub(task.id, e)}
                                          disabled={ghState?.status === 'syncing'}
                                          className={`flex items-center justify-center p-1.5 rounded-lg border transition-all ${
                                            ghState?.status === 'success'
                                              ? 'bg-status-success-glow border-status-success text-status-success'
                                              : ghState?.status === 'error'
                                              ? 'bg-status-error-glow border-status-error text-status-error'
                                              : 'bg-bg-elevated border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-focus'
                                          }`}
                                          title={ghState?.status === 'error' ? ghState.message : 'Sync to GitHub Issues'}
                                        >
                                          {ghState?.status === 'syncing' ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : ghState?.status === 'success' ? (
                                            <Check className="w-3.5 h-3.5" />
                                          ) : (
                                            <GithubIcon className="w-3.5 h-3.5" />
                                          )}
                                        </button>

                                        {/* Jira Sync */}
                                        <button
                                          onClick={(e) => handleExportJira(task.id, e)}
                                          disabled={jiraState?.status === 'syncing'}
                                          className={`flex items-center justify-center p-1.5 rounded-lg border transition-all ${
                                            jiraState?.status === 'success'
                                              ? 'bg-status-success-glow border-status-success text-status-success'
                                              : jiraState?.status === 'error'
                                              ? 'bg-status-error-glow border-status-error text-status-error'
                                              : 'bg-bg-elevated border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-focus'
                                          }`}
                                          title={jiraState?.status === 'error' ? jiraState.message : 'Sync to Jira backlog'}
                                        >
                                          {jiraState?.status === 'syncing' ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : jiraState?.status === 'success' ? (
                                            <Check className="w-3.5 h-3.5" />
                                          ) : (
                                            <TrelloIcon className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Task content (Level 4 Subtasks) */}
                                    {isTaskExpanded && (
                                      <div className="p-3 bg-bg-base/30 border-t border-border-subtle/30 space-y-3">
                                        
                                        {/* RAG Story Point Estimation Details Card */}
                                        {expandedEstimateIds[task.id] && estimates[task.id] && (
                                          <div className="p-4 bg-bg-elevated/40 rounded-xl border border-accent-primary/25 space-y-4 animate-fade-in-up">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle/40 pb-3">
                                              <div className="flex items-center gap-2">
                                                <div className="p-1 rounded bg-accent-subtle text-accent-primary animate-pulse">
                                                  <Sparkles className="w-4 h-4" />
                                                </div>
                                                <div>
                                                  <span className="text-xs font-bold text-text-primary">RAG Story Point Estimation</span>
                                                  <span className="text-[9px] text-text-tertiary block mt-0.5">Ground truth matching via historical project data</span>
                                                </div>
                                              </div>
                                              
                                              {/* Select override + Confidence */}
                                              <div className="flex items-center gap-4 self-end sm:self-auto" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Override:</span>
                                                  <select
                                                    value={estimates[task.id].finalPoints ?? estimates[task.id].aiSuggestedPoints ?? ''}
                                                    onChange={(e) => handleUpdateStoryPoints(task.id, Number(e.target.value))}
                                                    className="text-xs font-bold px-2 py-1 bg-bg-surface border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
                                                  >
                                                    {[1, 2, 3, 5, 8, 13, 20].map((pts) => (
                                                      <option key={pts} value={pts}>{pts} Points</option>
                                                    ))}
                                                  </select>
                                                </div>

                                                <div className="flex items-center gap-2 border-l border-border-subtle/40 pl-4">
                                                  <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Confidence:</span>
                                                  <div className="flex items-center gap-1.5">
                                                    <div className="w-12 h-1.5 bg-bg-surface rounded-full overflow-hidden shrink-0">
                                                      <div 
                                                        className={`h-full rounded-full ${
                                                          estimates[task.id].confidence >= 0.8
                                                            ? 'bg-accent-primary'
                                                            : estimates[task.id].confidence >= 0.5
                                                            ? 'bg-status-warning'
                                                            : 'bg-status-error'
                                                        }`}
                                                        style={{ width: `${estimates[task.id].confidence * 100}%` }}
                                                      />
                                                    </div>
                                                    <span className="text-[10px] font-mono font-bold text-text-secondary">
                                                      {(estimates[task.id].confidence * 100).toFixed(0)}%
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>

                                            {/* AI Rationale */}
                                            {estimates[task.id].rationale && (
                                              <div className="text-xs space-y-1.5">
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary block">Estimation Rationale</span>
                                                <p className="text-text-secondary leading-relaxed font-sans bg-bg-base/35 p-3 rounded-xl border border-border-subtle/40 shadow-inner">
                                                  {estimates[task.id].rationale}
                                                </p>
                                              </div>
                                            )}

                                            {/* RAG Analog References */}
                                            {estimates[task.id].ragReferences && estimates[task.id].ragReferences.length > 0 && (
                                              <div className="space-y-2">
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary block">RAG Analog References (Qdrant Matches)</span>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                  {estimates[task.id].ragReferences.map((ref: any, idx: number) => (
                                                    <div key={idx} className="p-3 bg-bg-surface/50 rounded-xl border border-border-subtle/30 flex flex-col justify-between hover:border-border-focus/30 transition-colors">
                                                      <div>
                                                        <div className="flex items-center justify-between gap-2 border-b border-border-subtle/30 pb-2 mb-2">
                                                          <span className="text-[10px] font-bold text-text-tertiary">Match #{idx + 1}</span>
                                                          <span className="text-[9px] font-mono font-bold text-accent-primary bg-accent-subtle px-1.5 py-0.5 rounded border border-accent-primary/10">
                                                            {(ref.similarityScore * 100).toFixed(0)}% Match
                                                          </span>
                                                        </div>
                                                        <h6 className="text-[11px] font-bold text-text-primary line-clamp-2 leading-relaxed" title={ref.similarItemTitle}>
                                                          {ref.similarItemTitle}
                                                        </h6>
                                                      </div>
                                                      <div className="mt-3.5 flex items-center justify-between text-[10px] pt-1.5 border-t border-border-subtle/20">
                                                        <span className="text-text-tertiary">Completed points:</span>
                                                        <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/10">
                                                          {ref.similarItemPoints} SP
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {taskSubtasks.length === 0 ? (
                                          <div className="text-[10px] text-text-tertiary italic pl-6 py-1">
                                            No subtasks decomposed yet. Click the "Subtasks" breakdown trigger button above.
                                          </div>
                                        ) : (
                                          <div className="pl-6 space-y-2">
                                            <span className="text-[8px] font-bold uppercase text-accent-primary tracking-wider block mb-1">Developer Execution Subtasks ({taskSubtasks.length})</span>
                                            {taskSubtasks.map(subtask => (
                                              <div key={subtask.id} className="flex items-center justify-between gap-4 p-2 bg-bg-surface/50 border border-border-subtle/50 rounded-lg">
                                                <div>
                                                  <h6 className="text-[11px] font-bold text-text-primary">{subtask.title}</h6>
                                                  {subtask.description && <p className="text-[10px] text-text-secondary mt-0.5">{subtask.description}</p>}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
