'use client';

import React, { useState, useEffect } from 'react';
import { conflictsApi } from '@/lib/api';
import type { ConflictReport } from '@/lib/ai/types';
import { 
  AlertTriangle, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  HelpCircle, 
  Copy, 
  Check, 
  ArrowRight, 
  BookOpen, 
  Image as ImageIcon 
} from 'lucide-react';

interface ConflictPanelProps {
  projectId: string;
  sourceOfTruthContent: string;
  onApplyFix: (fix: string) => void;
}

export default function ConflictPanel({ projectId, sourceOfTruthContent, onApplyFix }: ConflictPanelProps) {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<ConflictReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        setError(null);
        const data = await conflictsApi.getConflicts(projectId);
        if (data && data.length > 0) {
          setReports(data);
        }
      } catch (err: any) {
        console.error('Error fetching existing conflicts:', err);
      }
    };
    fetchExisting();
  }, [projectId]);

  const handleMarkSolved = async (conflictId: string) => {
    try {
      setError(null);
      await conflictsApi.resolve(projectId, conflictId);
      setReports(prev => prev ? prev.filter(r => r.id !== conflictId) : null);
    } catch (err: any) {
      console.error('Error resolving conflict:', err);
      setError(err.message || 'Failed to mark conflict as solved.');
    }
  };

  const handleScan = async () => {
    try {
      setLoading(true);
      setError(null);
      setReports(null);
      setStreamingText('');

      const response = await fetch(`/api/projects/${projectId}/conflicts`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to scan requirements for conflicts.');
      }

      const reader = response.body?.getReader();
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

      // Try to parse the complete JSON response at the end of the stream
      try {
        const cleanJson = runningText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        setReports(Array.isArray(parsed) ? parsed : []);
      } catch (parseErr) {
        console.error('Failed to parse final streamed JSON:', parseErr);
        throw new Error('AI returned an invalid JSON response structure. Please try scanning again.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to scan requirements for conflicts. Ensure your Source of Truth is not empty.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to get color classes based on severity
  const getSeverityStyles = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return {
          badge: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5',
          indicator: 'bg-red-500 animate-pulse',
        };
      case 'medium':
        return {
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5',
          indicator: 'bg-amber-500 animate-pulse',
        };
      case 'low':
      default:
        return {
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5',
          indicator: 'bg-blue-500',
        };
    }
  };

  return (
    <div className="mt-8 bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden animate-fade-in-up">
      <div className="p-6 border-b border-border-subtle bg-bg-elevated flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-subtle rounded-lg">
            <AlertTriangle className="w-5 h-5 text-accent-primary animate-pulse-glow" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Conflict & Ambiguity Detection</h2>
            <p className="text-xs text-text-tertiary mt-1">
              Verify SRS consistency across texts, rules, and visual Mermaid.js flowcharts
            </p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={loading || !sourceOfTruthContent}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-accent-primary to-accent-hover text-white font-semibold hover:shadow-lg hover:shadow-accent-primary/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none hover:-translate-y-[1px] active:translate-y-0 transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Reasoning Logic...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Scan Requirements
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-status-error-glow text-status-error text-sm font-medium border-b border-status-error/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-6 min-h-[160px] flex flex-col justify-center bg-bg-base/30">
        {/* State 1: Idle (Not Scanned Yet) */}
        {reports === null && !loading && (
          <div className="text-center py-8">
            <HelpCircle className="w-12 h-12 text-text-tertiary/20 mx-auto mb-3" />
            <p className="text-text-secondary font-medium">Ready to scan project constraints</p>
            <p className="text-text-tertiary text-xs max-w-md mx-auto mt-1">
              Click the scan button above. APMP's AI Reasoner will verify textual logic consistency and check for contradictions between raw rules and visual flowcharts.
            </p>
          </div>
        )}

        {/* State 2: Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center w-full">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-accent-glow border-t-accent-primary animate-spin" />
              <Sparkles className="w-6 h-6 text-accent-primary animate-pulse" />
            </div>
            <div>
              <p className="text-text-primary font-bold animate-pulse">Running Cross-Modal Reasoner...</p>
              <p className="text-text-tertiary text-xs mt-1">Analyzing logical paths, ambiguities, and chart consistency</p>
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

        {/* State 3: Clean (No Conflicts Found) */}
        {reports !== null && reports.length === 0 && !loading && (
          <div className="text-center py-10 bg-accent-subtle/20 border border-accent-primary/10 rounded-xl p-8 animate-fade-in-up">
            <CheckCircle className="w-12 h-12 text-accent-primary mx-auto mb-3 animate-pulse-glow" />
            <p className="text-accent-primary font-bold text-lg">No Logical Conflicts Found!</p>
            <p className="text-text-secondary text-sm max-w-lg mx-auto mt-1">
              The AI engine analyzed your textual requirements alongside extracted flowchart architectures and found 100% logical alignment. Your Source of Truth is stable.
            </p>
          </div>
        )}

        {/* State 4: Conflicts List */}
        {reports !== null && reports.length > 0 && !loading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary uppercase tracking-wider bg-bg-surface px-4 py-2 rounded-lg border border-border-subtle">
              <span>Identified Issues ({reports.length})</span>
              <span className="text-status-error flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-status-error animate-ping" />
                Attention Required
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {reports.map((report) => {
                const styles = getSeverityStyles(report.severity);
                return (
                  <div 
                    key={report.id} 
                    className="group bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden hover:border-accent-primary/20 hover:bg-bg-elevated/40 hover:shadow-lg transition-all animate-fade-in-up"
                  >
                    {/* Header */}
                    <div className="px-6 py-4 bg-bg-elevated/50 border-b border-border-subtle flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-text-tertiary bg-bg-base border border-border-subtle px-2.5 py-1 rounded-md">
                          {report.id}
                        </span>
                        <h3 className="font-bold text-text-primary text-base">
                          {report.description}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Type Badge */}
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-bg-base border border-border-subtle text-text-secondary">
                          {report.type}
                        </span>
                        {/* Severity Badge */}
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-inner ${styles.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${styles.indicator}`} />
                          {report.severity}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                      {/* LLM Explanation */}
                      <div>
                        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-accent-primary" />
                          Logical Analysis
                        </h4>
                        <p className="text-text-secondary text-sm leading-relaxed bg-bg-base/40 p-4 rounded-xl border border-border-subtle/50 font-sans shadow-inner">
                          {report.llmExplanation}
                        </p>
                      </div>

                      {/* Source References */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {report.sourceReferences.textSnippets.length > 0 && (
                          <div className="p-4 rounded-xl bg-bg-base/20 border border-border-subtle/40">
                            <h5 className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2.5">
                              Textual Contradiction References
                            </h5>
                            <ul className="space-y-2">
                              {report.sourceReferences.textSnippets.map((snippet, sIdx) => (
                                <li key={sIdx} className="text-xs text-text-tertiary bg-bg-base/60 p-2.5 rounded-lg border-l-2 border-accent-primary/40 italic">
                                  "{snippet}"
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {report.sourceReferences.imageIds.length > 0 && (
                          <div className="p-4 rounded-xl bg-bg-base/20 border border-border-subtle/40 flex flex-col">
                            <h5 className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-accent-primary" />
                              Conflicting Logic Diagrams
                            </h5>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {report.sourceReferences.imageIds.map((imgId, iIdx) => (
                                <span key={iIdx} className="text-xs font-semibold text-text-secondary bg-bg-elevated px-3 py-1.5 rounded-lg border border-border-subtle flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                                  Diagram File Ref: {imgId.substring(0, 10)}...
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Suggested Fix Area */}
                      <div className="pt-4 border-t border-border-subtle/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-accent-primary uppercase tracking-wider mb-1.5">
                            Suggested Resolution
                          </h4>
                          <p className="text-sm font-medium text-text-secondary">
                            {report.suggestedFix}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Copy Suggestion */}
                          <button
                            onClick={() => handleCopy(report.id, report.suggestedFix)}
                            className="p-3 rounded-xl bg-bg-elevated hover:bg-bg-overlay text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-focus transition-all cursor-pointer"
                            title="Copy suggestion to clipboard"
                          >
                            {copiedId === report.id ? <Check className="w-4 h-4 text-accent-primary" /> : <Copy className="w-4 h-4" />}
                          </button>

                          {/* Apply Resolution */}
                          <button
                            onClick={() => onApplyFix(report.suggestedFix)}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent-subtle hover:bg-accent-primary border border-accent-primary/20 hover:border-accent-primary text-accent-primary hover:text-white font-semibold transition-all hover:shadow-lg hover:shadow-accent-primary/5 cursor-pointer text-sm"
                          >
                            <span>Apply Resolution</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          {/* Mark Solved */}
                          <button
                            onClick={() => handleMarkSolved(report.id)}
                            className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-status-success-glow hover:bg-status-success text-status-success hover:text-white border border-status-success/20 hover:border-status-success font-semibold transition-all cursor-pointer text-sm"
                            title="Mark as solved and remove from list"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Mark Solved</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
