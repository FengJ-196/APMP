'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, FileText, ChevronRight, Loader2, BarChart3, Settings } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects/all')
      .then(res => res.json())
      .then(data => {
        setProjects(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-bg-base relative overflow-hidden pt-12">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-glow blur-[120px] rounded-full opacity-20 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-glow blur-[100px] rounded-full opacity-10 translate-y-1/4 -translate-x-1/4 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <header className="mb-12 animate-fade-in-up">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary mb-4">
            Dashboard
          </h1>
          <p className="text-text-tertiary max-w-2xl text-lg">
            Welcome to APMP. Manage your AI-driven software projects, analyze SRS documentation, and generate WBS from one central hub.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Area: Projects List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                Recent Projects
                <span className="text-xs font-normal text-text-tertiary bg-bg-elevated px-2 py-0.5 rounded-full">
                  {projects.length}
                </span>
              </h2>
              <Link href="/projects/create" className="text-sm text-accent-primary font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-4 h-4" /> New Project
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 bg-bg-surface/50 border border-border-subtle rounded-2xl">
                <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project, idx) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group bg-bg-surface border border-border-subtle p-5 rounded-2xl transition-all hover:bg-bg-elevated hover:border-accent-primary/30 hover:-translate-y-1 animate-fade-in-up"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center text-accent-primary group-hover:bg-accent-primary group-hover:text-white transition-all">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-accent-primary/60">
                        {project.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-1 group-hover:text-accent-primary transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-xs text-text-tertiary">
                      Created {new Date(project.created_at).toLocaleDateString()}
                    </p>
                    <div className="mt-4 flex items-center text-sm font-medium text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Open Workspace <ChevronRight className="w-4 h-4" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-border-subtle rounded-3xl bg-bg-surface/30">
                <p className="text-text-tertiary mb-4">No projects found</p>
                <Link href="/projects/create" className="auth-btn-primary px-6 inline-block">
                  Start First Project
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar Area: Stats & Quick Actions */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-text-primary">System Overview</h2>
            
            <div className="bg-bg-surface border border-border-subtle p-6 rounded-2xl space-y-6 animate-fade-in-up-delay-1">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-bg-elevated/50">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 text-accent-primary" />
                    <span className="text-text-secondary text-sm">Task Completion</span>
                  </div>
                  <span className="text-text-primary font-bold">84%</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-bg-elevated/50">
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-accent-primary" />
                    <span className="text-text-secondary text-sm">AI Efficiency</span>
                  </div>
                  <span className="text-text-primary font-bold">1.2s</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle">
                <p className="text-xs text-text-tertiary leading-relaxed">
                  Your workspace is synchronized with the latest AI analysis models. Uploading new sources will trigger automatic conflict detection.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-accent-primary/10 to-transparent border border-accent-primary/20 p-6 rounded-2xl animate-fade-in-up-delay-2">
              <h4 className="text-accent-primary font-bold mb-2">Pro Tip</h4>
              <p className="text-sm text-text-secondary">
                You can upload `.md` files directly for the best AI parsing results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
