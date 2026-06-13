'use client';

import React from 'react';
import { useProjectStore } from '@/lib/store/projectStore';
import WBSPanel from '@/components/WBSPanel';

export default function WBSPage() {
  const { projectId } = useProjectStore();

  if (!projectId) return null;

  return (
    <div className="w-full animate-fade-in-up">
      <WBSPanel projectId={projectId} />
    </div>
  );
}
