'use client';

import React, { useState, useEffect } from 'react';
import { sourceOfTruthApi } from '@/lib/api';
import type { SourceOfTruthDTO } from '@/dtos';
import { Loader2, Save, FileText, Clock, History } from 'lucide-react';


export default function SourceOfTruthPanel({ projectId }: { projectId: string }) {
  const [sourceOfTruth, setSourceOfTruth] = useState<SourceOfTruthDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hasFullHistory, setHasFullHistory] = useState(false);
  const [fetchingFullHistory, setFetchingFullHistory] = useState(false);

  useEffect(() => {
    fetchSourceOfTruth();
  }, [projectId]);

  const fetchSourceOfTruth = async (full: boolean = false) => {
    try {
      if (full) setFetchingFullHistory(true);
      else setLoading(true);
      
      const data = await sourceOfTruthApi.getByProjectId(projectId, full);
      setSourceOfTruth(data);
      setContent(data.content || '');
      if (full) setHasFullHistory(true);
    } catch (err: any) {
      if (err.message?.includes('404')) {
        // Not found, we can create one
        setSourceOfTruth(null);
      } else {
        setError('Failed to load Source of Truth');
      }
    } finally {
      setLoading(false);
      setFetchingFullHistory(false);
    }
  };

  const handleToggleHistory = () => {
    if (!showHistory && !hasFullHistory) {
      fetchSourceOfTruth(true);
    }
    setShowHistory(!showHistory);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      if (sourceOfTruth) {
        const updated = await sourceOfTruthApi.update(projectId, content);
        setSourceOfTruth(updated);
      } else {
        const created = await sourceOfTruthApi.create(projectId, content);
        setSourceOfTruth(created);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save Source of Truth');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-bg-surface border border-border-subtle rounded-2xl animate-fade-in-up mt-8">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="mt-12 bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden animate-fade-in-up">
      <div className="p-6 border-b border-border-subtle bg-bg-elevated flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-subtle rounded-lg">
            <FileText className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Source of Truth</h2>
            <p className="text-xs text-text-tertiary mt-1">
              {sourceOfTruth ? `Version v${sourceOfTruth.versionNumber}` : 'Not initialized'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sourceOfTruth && sourceOfTruth.versionHistory.length > 0 && (
            <button
              onClick={handleToggleHistory}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-base border border-border-subtle text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
            >
              {fetchingFullHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
              History
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || content === sourceOfTruth?.content}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-accent-primary text-white font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-status-error-glow text-status-error text-sm font-medium border-b border-status-error/20">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row h-[600px]">
        {/* Editor Area */}
        <div className={`flex-1 p-6 ${showHistory ? 'hidden md:block md:w-2/3 border-r border-border-subtle' : ''}`}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-4 rounded-xl bg-bg-base border border-border-subtle focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/50 text-text-primary resize-none outline-none font-mono text-sm transition-all shadow-inner"
            placeholder="# Source of Truth Markdown...&#10;&#10;Start defining your central requirements and data here."
          />
        </div>

        {/* History Panel */}
        {showHistory && sourceOfTruth && (
          <div className="w-full md:w-1/3 bg-bg-elevated overflow-y-auto p-6 animate-slide-in-right">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Version History
            </h3>
            <div className="space-y-4">
              {/* Current Version */}
              <div className="relative pl-6 pb-4 border-l-2 border-accent-primary">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-accent-primary border-4 border-bg-elevated"></div>
                <h4 className="text-sm font-bold text-text-primary">v{sourceOfTruth.versionNumber} (Current)</h4>
                <p className="text-xs text-text-tertiary mt-1">
                  Last updated: {new Date(sourceOfTruth.updatedAt).toLocaleString()}
                </p>
              </div>

              {/* Past Versions */}
              {[...sourceOfTruth.versionHistory].reverse().map((snapshot, idx) => (
                <div key={idx} className="relative pl-6 pb-4 border-l-2 border-border-subtle last:border-0 last:pb-0">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-border-subtle border-4 border-bg-elevated"></div>
                  <h4 className="text-sm font-semibold text-text-secondary">v{snapshot.versionNumber}</h4>
                  <p className="text-xs text-text-tertiary mt-1">
                    Saved on: {new Date(snapshot.savedAt).toLocaleString()}
                  </p>
                  <button 
                    onClick={() => {
                      if (confirm(`Restore content from v${snapshot.versionNumber}? Any unsaved changes will be lost.`)) {
                        setContent(snapshot.content || '');
                      }
                    }}
                    className="mt-3 text-xs font-medium text-accent-primary hover:text-accent-hover transition-colors"
                  >
                    Load this version
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
