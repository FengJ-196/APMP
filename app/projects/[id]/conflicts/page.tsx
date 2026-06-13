'use client';

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/lib/store/projectStore';
import ConflictPanel from '@/components/ConflictPanel';
import { sourceOfTruthApi } from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ConflictsPage() {
  const { projectId } = useProjectStore();
  const [sotContent, setSotContent] = useState<string>('');
  const [sotLoading, setSotLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchSOT();
    }
  }, [projectId]);

  const fetchSOT = async () => {
    try {
      setSotLoading(true);
      const data = await sourceOfTruthApi.getByProjectId(projectId!);
      setSotContent(data?.content || '');
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        console.error('Failed to fetch Source of Truth:', err);
      }
      setSotContent('');
    } finally {
      setSotLoading(false);
    }
  };

  const handleApplyFix = async (fixText: string) => {
    if (!projectId) return;
    try {
      const newContent = sotContent ? sotContent + '\n\n' + fixText : fixText;
      let data;
      try {
        data = await sourceOfTruthApi.getByProjectId(projectId);
      } catch (err) {}
      
      if (data) {
        await sourceOfTruthApi.update(projectId, newContent);
      } else {
        await sourceOfTruthApi.create(projectId, newContent);
      }
      
      setSotContent(newContent);
      alert('Resolution applied and saved to Source of Truth successfully!');
    } catch (err: any) {
      alert('Failed to save resolution: ' + err.message);
    }
  };

  if (!projectId) return null;

  return (
    <div className="w-full animate-fade-in-up space-y-6">
      
      {/* Tab Header */}
      <div className="border-b border-border-subtle pb-6">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Logical Alignment & Conflicts</h1>
        <p className="text-sm text-text-tertiary mt-1">Audit requirements to catch ambiguities and inconsistencies across text rules and diagrams.</p>
      </div>

      {sotLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
          <p className="text-sm text-text-tertiary">Analyzing requirements status...</p>
        </div>
      ) : !sotContent ? (
        <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-border-subtle rounded-3xl bg-bg-surface/30 px-6 text-center max-w-2xl mx-auto mt-6">
          <AlertCircle className="w-12 h-12 text-text-tertiary mb-4 opacity-25" />
          <h3 className="font-bold text-text-primary text-lg">Source of Truth is Empty</h3>
          <p className="text-text-secondary text-sm mt-2">
            You must have content in your Source of Truth to scan for logical conflicts. 
            Upload files or create an initial requirements spec in the **Files** or **Source of Truth** tabs first.
          </p>
        </div>
      ) : (
        <ConflictPanel 
          projectId={projectId} 
          sourceOfTruthContent={sotContent} 
          onApplyFix={handleApplyFix} 
        />
      )}

    </div>
  );
}
