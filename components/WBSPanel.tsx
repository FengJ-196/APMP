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
  AlertCircle
} from 'lucide-react';

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
  const [breakingTaskId, setBreakingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  
  // Sync inputs
  const [ghOwner, setGhOwner] = useState('FengJ-196');
  const [ghRepo, setGhRepo] = useState('APMP');
  const [jiraProjectKey, setJiraProjectKey] = useState('KAN');
  const [jiraEmail, setJiraEmail] = useState('thanhphongwf@gmail.com');
  const [jiraDomain, setJiraDomain] = useState('graduationtestingspace.atlassian.net');
  const [jiraToken, setJiraToken] = useState('');

  // Sync statuses per item
  const [syncStates, setSyncStates] = useState<Record<string, { type: 'github' | 'jira'; status: 'syncing' | 'success' | 'error'; message?: string }>>({});

  useEffect(() => {
    fetchWBS();
  }, [projectId]);

  const fetchWBS = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/wbs`);
      if (!res.ok) throw new Error('Failed to load WBS items.');
      const data = await res.json();
      setItems(data);
      
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

  const handleGenerateWBS = async () => {
    try {
      setGenerating(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/wbs`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errText = await res.json();
        throw new Error(errText.error || 'Failed to generate WBS.');
      }
      const data = await res.json();
      setItems(data);
      
      // Auto-expand all new nodes
      const newExpanded: Record<string, boolean> = {};
      data.forEach((item: WBSItem) => {
        if (item.type === 'epic' || item.type === 'story') {
          newExpanded[item.id] = true;
        }
      });
      setExpandedIds(newExpanded);
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
      });
      if (!res.ok) {
        const errText = await res.json();
        throw new Error(errText.error || 'Failed to breakdown task.');
      }
      // Re-fetch all items to show newly added subtasks
      const fetchRes = await fetch(`/api/projects/${projectId}/wbs`);
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

  const handleExportGitHub = async (wbsItemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setSyncStates(prev => ({ ...prev, [`${wbsItemId}-github`]: { type: 'github', status: 'syncing' } }));
      const res = await fetch('/api/github/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    try {
      setSyncStates(prev => ({ ...prev, [`${wbsItemId}-jira`]: { type: 'jira', status: 'syncing' } }));
      const res = await fetch('/api/jira/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          wbsItemId, 
          projectKey: jiraProjectKey,
          email: jiraEmail,
          domain: jiraDomain,
          apiToken: jiraToken
        }),
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
          <button
            onClick={handleGenerateWBS}
            disabled={generating || loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-accent-primary to-accent-hover text-white font-semibold hover:shadow-lg hover:shadow-accent-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
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

      {/* Sync Configurations block */}
      <div className="px-6 py-4 bg-bg-base/30 border-b border-border-subtle grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* GitHub configuration */}
        <div className="space-y-2 p-3 bg-bg-elevated/40 rounded-xl border border-border-subtle/50">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
            <GithubIcon className="w-3.5 h-3.5" />
            <span>GitHub Sync Target</span>
          </div>
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

        {/* Jira configuration */}
        <div className="col-span-1 lg:col-span-2 space-y-2 p-3 bg-bg-elevated/40 rounded-xl border border-border-subtle/50 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
            <TrelloIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Jira Sync Target & Credentials</span>
          </div>
          <input 
            type="text" 
            placeholder="Proj Key (e.g. KAN)" 
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
        </div>
      </div>

      {error && (
        <div className="p-4 bg-status-error-glow text-status-error text-sm font-medium border-b border-status-error/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Tree List */}
      <div className="p-6 bg-bg-base/10 min-h-[200px]">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
          </div>
        )}

        {!loading && epics.length === 0 && (
          <div className="text-center py-12 text-text-tertiary">
            <FileText className="w-12 h-12 text-text-tertiary/20 mx-auto mb-3" />
            <p className="font-semibold text-text-secondary">WBS Structure is empty</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">Click "Generate WBS Tree" to run the requirements decomposition and populate the agile breakdown.</p>
          </div>
        )}

        {/* Epics rendering */}
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
                                      <div className="p-3 bg-bg-base/30 border-t border-border-subtle/30 space-y-2">
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
      </div>
    </div>
  );
}
