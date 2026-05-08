'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'web-app',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.name,
          userId: '645a1b2c3d4e5f6a7b8c9d0e', // Valid mock ObjectId
        }),
      });

      if (!res.ok) throw new Error('Failed to create project');

      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError('Could not create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-bg-base py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-10 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Create New Project</h1>
          <p className="text-text-tertiary">Set up your workspace and define your project goals.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 bg-bg-surface border border-border-subtle p-8 rounded-2xl animate-fade-in-up-delay-1 shadow-xl">
          {error && (
            <div className="p-4 rounded-xl bg-status-error-glow border border-status-error/20 text-status-error text-sm font-medium">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Project Name
            </label>
            <input
              type="text"
              required
              className="auth-input"
              placeholder="e.g. AI-Powered CRM"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              className="auth-input min-h-[120px] resize-none"
              placeholder="Briefly describe the project scope..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Project Type
            </label>
            <select
              className="auth-input"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="web-app">Web Application</option>
              <option value="mobile-app">Mobile Application</option>
              <option value="ai-model">AI / ML Model</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex-1 py-3 px-4 rounded-xl border border-border-subtle text-text-secondary font-medium hover:bg-bg-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] auth-btn-primary flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
