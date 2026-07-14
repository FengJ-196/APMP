'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, ChevronRight, Loader2, BarChart3, Settings } from 'lucide-react';
import { projectsApi } from '@/lib/api';

interface Project {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUserId = localStorage.getItem('userId');

    if (!token) {
      router.push('/login');
      return;
    }

    // Use the stored userId if available, otherwise fallback to mock
    const userIdToUse = storedUserId || '645a1b2c3d4e5f6a7b8c9d0e';

    projectsApi.getAll(userIdToUse)
      .then(data => {
        setProjects(Array.isArray(data) ? data as any : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-bg-base relative overflow-hidden pt-12">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-glow blur-[120px] rounded-full opacity-20 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-glow blur-[100px] rounded-full opacity-10 translate-y-1/4 -translate-x-1/4 pointer-events-none" />

      <div className="w-full px-6 md:px-10 lg:px-16 relative z-10">
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
        </div>
      </div>
    </div>
  );
}
