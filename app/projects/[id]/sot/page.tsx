'use client';

import React from 'react';
import { useProjectStore } from '@/lib/store/projectStore';
import SourceOfTruthPanel from '@/components/SourceOfTruthPanel';

export default function SourceOfTruthPage() {
  const { projectId } = useProjectStore();

  if (!projectId) return null;

  return (
    <div className="w-full animate-fade-in-up space-y-6">
      <div className="border-b border-border-subtle pb-6">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Source of Truth</h1>
        <p className="text-sm text-text-tertiary mt-1">Refine and manage the consolidated markdown system requirements specification (SRS).</p>
      </div>

      <SourceOfTruthPanel projectId={projectId} />
    </div>
  );
}
