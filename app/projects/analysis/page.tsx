'use client';

import React from 'react';

export default function AnalysisPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-bg-base py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-text-primary mb-2">SRS Analysis</h1>
          <p className="text-text-tertiary">Upload your Software Requirements Specification for AI-driven conflict detection and structure analysis.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Area */}
            <div className="bg-bg-surface border-2 border-dashed border-border-subtle p-12 rounded-2xl flex flex-col items-center justify-center text-center animate-fade-in-up-delay-1 hover:border-accent-primary/50 transition-colors cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-accent-glow flex items-center justify-center text-accent-primary mb-4 group-hover:scale-110 transition-transform">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">Upload Document</h3>
              <p className="text-text-tertiary text-sm max-w-xs">
                Drag and drop your PDF or Markdown SRS file here, or click to browse.
              </p>
            </div>

            {/* Analysis History Placeholder */}
            <div className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden animate-fade-in-up-delay-2">
              <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center">
                <h3 className="font-semibold text-text-primary">Recent Analyses</h3>
                <span className="text-xs text-accent-primary font-medium">View All</span>
              </div>
              <div className="p-6 flex flex-col items-center justify-center py-12 text-center">
                <div className="text-text-tertiary mb-2 italic">No documents analyzed yet.</div>
                <p className="text-text-tertiary text-xs">Your analysis history will appear here once you upload a document.</p>
              </div>
            </div>
          </div>

          {/* Analysis Info Sidebar */}
          <div className="space-y-6 animate-fade-in-up-delay-3">
             <div className="bg-bg-surface border border-border-subtle p-6 rounded-2xl">
                <h4 className="font-semibold text-text-primary mb-4">How it works</h4>
                <ul className="space-y-4 text-sm text-text-tertiary">
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-bg-elevated flex items-center justify-center text-[10px] font-bold text-text-primary shrink-0">1</span>
                    <span>AI parses your requirements and identifies core entities.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-bg-elevated flex items-center justify-center text-[10px] font-bold text-text-primary shrink-0">2</span>
                    <span>Conflict detection scans for logical inconsistencies.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-bg-elevated flex items-center justify-center text-[10px] font-bold text-text-primary shrink-0">3</span>
                    <span>Exportable WBS and project structure are generated.</span>
                  </li>
                </ul>
             </div>

             <div className="bg-accent-glow/30 border border-accent-primary/20 p-6 rounded-2xl">
                <h4 className="font-semibold text-accent-primary mb-2">Premium Feature</h4>
                <p className="text-text-tertiary text-sm">
                  Deep RAG integration is currently in experimental phase. Accessing high-density vector mapping.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
