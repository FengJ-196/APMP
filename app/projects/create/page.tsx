'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { projectsApi } from '@/lib/api';

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const storedUserId = localStorage.getItem('userId') || '645a1b2c3d4e5f6a7b8c9d0e';
      
      const project = await projectsApi.create({
        title: formData.title,
        userId: storedUserId,
      });

      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message || 'Could not create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-bg-base flex items-center justify-center py-12 px-6">
      <div className="max-w-xl w-full">
        <header className="mb-10 text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-subtle mb-6 border border-accent-primary/20">
            <Loader2 className="w-8 h-8 text-accent-primary" />
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-3 tracking-tight">Create New Project</h1>
          <p className="text-text-tertiary text-lg">Initialize your workspace with a title to get started.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10 bg-bg-surface border border-border-subtle p-10 rounded-3xl animate-fade-in-up-delay-1 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-primary to-transparent opacity-50" />
          
          {error && (
            <div className="p-4 rounded-xl bg-status-error-glow border border-status-error/20 text-status-error text-sm font-medium animate-shake">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-text-tertiary uppercase tracking-[0.2em] mb-4">
              Project Title
            </label>
            <input
              type="text"
              required
              autoFocus
              className="w-full bg-bg-base border-2 border-border-subtle focus:border-accent-primary rounded-2xl px-6 py-5 text-xl text-text-primary transition-all outline-none shadow-sm focus:shadow-accent-primary/10"
              placeholder="e.g. NextGen Analytics Platform"
              value={formData.title}
              onChange={(e) => setFormData({ title: e.target.value })}
            />
            <p className="mt-3 text-xs text-text-tertiary">
              This will be the primary name of your workspace.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex-1 py-4 px-6 rounded-2xl border-2 border-border-subtle text-text-secondary font-bold hover:bg-bg-elevated hover:border-text-tertiary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-accent-primary hover:bg-accent-hover disabled:bg-accent-primary/50 text-white py-4 px-6 rounded-2xl font-bold shadow-lg shadow-accent-primary/20 transition-all flex items-center justify-center gap-3 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Initializing...</span>
                </>
              ) : (
                <span>Launch Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
