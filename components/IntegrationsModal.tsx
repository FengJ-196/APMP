'use client';

import React, { useState, useEffect } from 'react';
import { X, Cloud, Key, Check, AlertCircle, Loader2, ArrowRight, Settings, ExternalLink } from 'lucide-react';
import { integrationsApi, projectsApi } from '@/lib/api';

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

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentGithubRepo?: string;
  currentJiraProjectKey?: string;
  onSaved: () => void;
}

export default function IntegrationsModal({
  isOpen,
  onClose,
  projectId,
  currentGithubRepo = '',
  currentJiraProjectKey = '',
  onSaved,
}: IntegrationsModalProps) {
  const [activeTab, setActiveTab] = useState<'github' | 'jira'>('github');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GitHub manual form states
  const [ghToken, setGhToken] = useState('');
  const [ghManualOpen, setGhManualOpen] = useState(false);
  const [ghSubmitting, setGhSubmitting] = useState(false);

  // Jira manual form states
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraManualOpen, setJiraManualOpen] = useState(false);
  const [jiraSubmitting, setJiraSubmitting] = useState(false);

  // Fetched repositories and projects
  const [repos, setRepos] = useState<any[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(currentGithubRepo);

  const [jiraProjects, setJiraProjects] = useState<any[]>([]);
  const [jiraProjectsLoading, setJiraProjectsLoading] = useState(false);
  const [selectedJiraProject, setSelectedJiraProject] = useState(currentJiraProjectKey);

  const [savingLink, setSavingLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setSelectedRepo(currentGithubRepo);
      setSelectedJiraProject(currentJiraProjectKey);
    }
  }, [isOpen, projectId, currentGithubRepo, currentJiraProjectKey]);

  useEffect(() => {
    if (status) {
      if (status.github?.connected) {
        fetchGithubRepos();
      }
      if (status.jira?.connected) {
        fetchJiraProjects();
      }
    }
  }, [status]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await integrationsApi.getStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load integration status');
    } finally {
      setLoading(false);
    }
  };

  const fetchGithubRepos = async () => {
    try {
      setReposLoading(true);
      const data = await integrationsApi.getGithubRepos();
      setRepos(data);
    } catch (err) {
      console.error('Failed to fetch GitHub repos', err);
    } finally {
      setReposLoading(false);
    }
  };

  const fetchJiraProjects = async () => {
    try {
      setJiraProjectsLoading(true);
      const data = await integrationsApi.getJiraProjects();
      setJiraProjects(data);
    } catch (err) {
      console.error('Failed to fetch Jira projects', err);
    } finally {
      setJiraProjectsLoading(false);
    }
  };

  const handleConnectOAuth = async (platform: 'github' | 'jira') => {
    try {
      const endpoint = `/api/${platform}/authorize?projectId=${projectId}`;
      const res = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to initiate ${platform} auth`);
      }
      const { authorizeUrl } = await res.json();
      window.location.href = authorizeUrl;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveGithubManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghToken) return;

    try {
      setGhSubmitting(true);
      setError(null);
      await integrationsApi.saveManual({
        platform: 'github',
        apiToken: ghToken,
      });
      setGhToken('');
      setGhManualOpen(false);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to connect GitHub manually');
    } finally {
      setGhSubmitting(false);
    }
  };

  const handleSaveJiraManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jiraEmail || !jiraDomain || !jiraToken) return;

    try {
      setJiraSubmitting(true);
      setError(null);
      await integrationsApi.saveManual({
        platform: 'jira',
        apiToken: jiraToken,
        email: jiraEmail,
        domain: jiraDomain,
      });
      setJiraToken('');
      setJiraEmail('');
      setJiraDomain('');
      setJiraManualOpen(false);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to connect Jira manually');
    } finally {
      setJiraSubmitting(false);
    }
  };

  const handleDisconnect = async (platform: 'github' | 'jira') => {
    if (!confirm(`Are you sure you want to disconnect ${platform === 'github' ? 'GitHub' : 'Jira'}?`)) {
      return;
    }
    try {
      setLoading(true);
      await integrationsApi.disconnect(platform);
      if (platform === 'github') {
        setRepos([]);
        setSelectedRepo('');
      } else {
        setJiraProjects([]);
        setSelectedJiraProject('');
      }
      await fetchStatus();
    } catch (err: any) {
      setError(err.message || `Failed to disconnect ${platform}`);
      setLoading(false);
    }
  };

  const handleLinkRepository = async () => {
    try {
      setSavingLink(true);
      setError(null);
      await projectsApi.update(projectId, { githubRepo: selectedRepo });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to update linked repository');
    } finally {
      setSavingLink(false);
    }
  };

  const handleLinkJiraProject = async () => {
    try {
      setSavingLink(true);
      setError(null);
      await projectsApi.update(projectId, { jiraProjectKey: selectedJiraProject });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to update linked Jira project');
    } finally {
      setSavingLink(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle bg-bg-elevated/40">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent-primary animate-spin-slow" />
            <h2 className="text-xl font-bold text-text-primary">Workspace Integrations</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-bg-elevated text-text-tertiary hover:text-text-primary hover:bg-bg-overlay transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border-subtle bg-bg-base/35">
          <button
            onClick={() => setActiveTab('github')}
            className={`flex-1 py-4 text-center text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'github'
                ? 'border-accent-primary text-accent-primary bg-bg-elevated/20'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated/10'
            }`}
          >
            <GithubIcon className="w-4 h-4" />
            <span>GitHub Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('jira')}
            className={`flex-1 py-4 text-center text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'jira'
                ? 'border-accent-primary text-accent-primary bg-bg-elevated/20'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated/10'
            }`}
          >
            <Cloud className="w-4 h-4 text-blue-400" />
            <span>Jira Cloud</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-status-error-glow border border-status-error/20 flex items-center gap-3 text-status-error animate-fade-in-up">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
              <p className="text-sm text-text-tertiary">Retrieving integration profiles...</p>
            </div>
          ) : (
            <>
              {/* GitHub Integration tab */}
              {activeTab === 'github' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-bg-elevated/30 border border-border-subtle p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-text-primary flex items-center gap-2">
                        <GithubIcon className="w-5 h-5 text-text-primary" /> GitHub Connection
                      </h3>
                      <p className="text-xs text-text-tertiary mt-1">
                        {status.github?.connected
                          ? `Status: Connected via ${status.github.authType === 'basic' ? 'Developer Token' : 'OAuth app'}`
                          : 'Status: Disconnected. Connect to auto-sync requirements to GitHub issues.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {status.github?.connected ? (
                        <button
                          onClick={() => handleDisconnect('github')}
                          className="px-4 py-2 bg-status-error-glow hover:bg-status-error text-status-error hover:text-white border border-status-error/20 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleConnectOAuth('github')}
                            className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-accent-primary/10 transition-all hover:-translate-y-0.5 cursor-pointer"
                          >
                            <span>Connect OAuth</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setGhManualOpen(!ghManualOpen)}
                            className="px-4 py-2 bg-bg-elevated hover:bg-bg-overlay border border-border-subtle text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Manual Token</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manual token input form */}
                  {!status.github?.connected && ghManualOpen && (
                    <form onSubmit={handleSaveGithubManual} className="bg-bg-base/30 border border-border-subtle/50 p-5 rounded-2xl space-y-4 animate-fade-in-up">
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                          GitHub Personal Access Token (PAT)
                        </label>
                        <input
                          type="password"
                          required
                          value={ghToken}
                          onChange={(e) => setGhToken(e.target.value)}
                          placeholder="github_pat_..."
                          className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={ghSubmitting}
                        className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-40"
                      >
                        {ghSubmitting && <Loader2 className="w-3 animate-spin" />}
                        <span>Save Credentials</span>
                      </button>
                    </form>
                  )}

                  {/* Project-specific configuration */}
                  {status.github?.connected && (
                    <div className="space-y-4 pt-4 border-t border-border-subtle">
                      <h4 className="text-sm font-bold text-text-primary">Choose Repository for This Project</h4>
                      <p className="text-xs text-text-tertiary">
                        Select a repository where APMP will export WBS tasks as GitHub issues.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          {reposLoading ? (
                            <div className="h-10 bg-bg-base border border-border-subtle rounded-xl flex items-center px-4 gap-2">
                              <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />
                              <span className="text-xs text-text-tertiary">Fetching your GitHub repositories...</span>
                            </div>
                          ) : repos.length > 0 ? (
                            <select
                              value={selectedRepo}
                              onChange={(e) => setSelectedRepo(e.target.value)}
                              className="w-full h-10 px-3 bg-bg-base border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                            >
                              <option value="">-- Select GitHub Repository --</option>
                              {repos.map((r: any) => (
                                <option key={r.id} value={r.fullName}>
                                  {r.fullName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Enter custom repository (e.g. owner/repo)"
                                value={selectedRepo}
                                onChange={(e) => setSelectedRepo(e.target.value)}
                                className="w-full h-10 px-3 bg-bg-base border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                              />
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleLinkRepository}
                          disabled={savingLink}
                          className="h-10 px-5 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 shrink-0 cursor-pointer"
                        >
                          {savingLink && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Link Repository</span>
                        </button>
                      </div>
                      {currentGithubRepo && (
                        <div className="p-3 bg-accent-subtle/30 border border-accent-primary/20 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-text-secondary">Linked Target: <strong className="text-accent-primary">{currentGithubRepo}</strong></span>
                          <a
                            href={`https://github.com/${currentGithubRepo}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent-primary hover:underline flex items-center gap-0.5"
                          >
                            <span>Open Repository</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Jira Integration tab */}
              {activeTab === 'jira' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-bg-elevated/30 border border-border-subtle p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-text-primary flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-blue-400" /> Jira Cloud Connection
                      </h3>
                      <p className="text-xs text-text-tertiary mt-1">
                        {status.jira?.connected
                          ? `Status: Connected as ${status.jira.email || 'OAuth site'} (${status.jira.domain || 'OAuth'})`
                          : 'Status: Disconnected. Connect to export agile tasks to your Jira Backlog.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {status.jira?.connected ? (
                        <button
                          onClick={() => handleDisconnect('jira')}
                          className="px-4 py-2 bg-status-error-glow hover:bg-status-error text-status-error hover:text-white border border-status-error/20 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleConnectOAuth('jira')}
                            className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-accent-primary/10 transition-all hover:-translate-y-0.5 cursor-pointer"
                          >
                            <span>Connect OAuth</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setJiraManualOpen(!jiraManualOpen)}
                            className="px-4 py-2 bg-bg-elevated hover:bg-bg-overlay border border-border-subtle text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Basic Auth</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manual token input form */}
                  {!status.jira?.connected && jiraManualOpen && (
                    <form onSubmit={handleSaveJiraManual} className="bg-bg-base/30 border border-border-subtle/50 p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                          Jira Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={jiraEmail}
                          onChange={(e) => setJiraEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                          Jira Cloud Site Domain
                        </label>
                        <input
                          type="text"
                          required
                          value={jiraDomain}
                          onChange={(e) => setJiraDomain(e.target.value)}
                          placeholder="company.atlassian.net"
                          className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                          Atlassian API Token
                        </label>
                        <input
                          type="password"
                          required
                          value={jiraToken}
                          onChange={(e) => setJiraToken(e.target.value)}
                          placeholder="Enter Atlassian API token..."
                          className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          disabled={jiraSubmitting}
                          className="px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-40"
                        >
                          {jiraSubmitting && <Loader2 className="w-3 animate-spin" />}
                          <span>Save Credentials</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Project-specific configuration */}
                  {status.jira?.connected && (
                    <div className="space-y-4 pt-4 border-t border-border-subtle">
                      <h4 className="text-sm font-bold text-text-primary">Choose Jira Project for This Workspace</h4>
                      <p className="text-xs text-text-tertiary">
                        Select a Jira project workspace key where APMP will sync and export tasks.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          {jiraProjectsLoading ? (
                            <div className="h-10 bg-bg-base border border-border-subtle rounded-xl flex items-center px-4 gap-2">
                              <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />
                              <span className="text-xs text-text-tertiary">Fetching your Jira projects...</span>
                            </div>
                          ) : jiraProjects.length > 0 ? (
                            <select
                              value={selectedJiraProject}
                              onChange={(e) => setSelectedJiraProject(e.target.value)}
                              className="w-full h-10 px-3 bg-bg-base border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                            >
                              <option value="">-- Select Jira Project Key --</option>
                              {jiraProjects.map((p: any) => (
                                <option key={p.id} value={p.key}>
                                  {p.key} - {p.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="Enter custom Jira Project Key (e.g. KAN)"
                              value={selectedJiraProject}
                              onChange={(e) => setSelectedJiraProject(e.target.value)}
                              className="w-full h-10 px-3 bg-bg-base border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                            />
                          )}
                        </div>

                        <button
                          onClick={handleLinkJiraProject}
                          disabled={savingLink}
                          className="h-10 px-5 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 shrink-0 cursor-pointer"
                        >
                          {savingLink && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Link Project</span>
                        </button>
                      </div>
                      {currentJiraProjectKey && (
                        <div className="p-3 bg-accent-subtle/30 border border-accent-primary/20 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-text-secondary">Linked Target Key: <strong className="text-accent-primary">{currentJiraProjectKey}</strong></span>
                          {status.jira?.domain && (
                            <a
                              href={`https://${status.jira.domain.replace(/^https?:\/\//, '')}/browse/${currentJiraProjectKey}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent-primary hover:underline flex items-center gap-0.5"
                            >
                              <span>Open Jira Workspace</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-border-subtle bg-bg-elevated/20">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-bg-elevated hover:bg-bg-overlay border border-border-subtle text-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
