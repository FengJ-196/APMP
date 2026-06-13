'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store/projectStore';
import Navbar from '@/components/Navbar';
import { 
  FileText, 
  FileSignature, 
  AlertTriangle, 
  ListTodo, 
  Settings, 
  Loader2,
  ChevronRight,
  GitPullRequest,
  CheckCircle2,
  Link2
} from 'lucide-react';

export default function ProjectWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams() as { id: string };
  const pathname = usePathname();
  const router = useRouter();
  
  const { setProjectId, project, loading, error } = useProjectStore();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    if (id) {
      setProjectId(id);
    }
  }, [id, setProjectId, router]);

  // Sidebar navigation tabs
  const navItems = [
    {
      name: 'Files',
      href: `/projects/${id}/files`,
      icon: FileText,
      description: 'SRS & diagram sources',
    },
    {
      name: 'Source of Truth',
      href: `/projects/${id}/sot`,
      icon: FileSignature,
      description: 'Active requirements spec',
    },
    {
      name: 'Conflicts',
      href: `/projects/${id}/conflicts`,
      icon: AlertTriangle,
      description: 'SRS logical consistency',
    },
    {
      name: 'WBS Breakdown',
      href: `/projects/${id}/wbs`,
      icon: ListTodo,
      description: 'Agile tasks & story points',
    },
    {
      name: 'Integrations',
      href: `/projects/${id}/integrations`,
      icon: Settings,
      description: 'GitHub & Jira sync linking',
    },
  ];

  if (loading && !project) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-accent-primary animate-spin" />
        <p className="text-text-secondary animate-pulse">Loading workspace environment...</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-status-error-glow flex items-center justify-center text-status-error mb-4 border border-status-error/15">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Failed to Load Workspace</h2>
        <p className="text-text-tertiary max-w-md mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-accent-primary hover:bg-accent-hover text-white rounded-xl font-semibold transition-all shadow-lg shadow-accent-primary/20"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      <Navbar />

      <div className="flex flex-1 pt-16 h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Workspace Sidebar */}
        <aside className="w-80 bg-bg-surface/50 border-r border-border-subtle flex flex-col justify-between hidden md:flex shrink-0">
          <div className="p-6 space-y-6">
            
            {/* Project Header */}
            <div>
              <span className="px-2 py-0.5 rounded bg-accent-subtle border border-accent-primary/20 text-[9px] font-bold text-accent-primary uppercase tracking-widest">
                {project?.status || 'Active'}
              </span>
              <h2 className="text-xl font-bold text-text-primary tracking-tight mt-2 truncate" title={project?.title}>
                {project?.title}
              </h2>
              <span className="text-[10px] text-text-tertiary font-mono block mt-0.5">ID: {project?.id}</span>
            </div>

            {/* Sidebar Navigation */}
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all group ${
                      isActive
                        ? 'bg-accent-subtle text-accent-primary font-bold border-l-4 border-accent-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/45'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-accent-primary' : 'text-text-tertiary group-hover:text-accent-primary transition-colors'}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold block">{item.name}</span>
                      <span className="text-[10px] text-text-tertiary group-hover:text-text-secondary font-normal block truncate mt-0.5">
                        {item.description}
                      </span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${isActive ? 'text-accent-primary opacity-100' : ''}`} />
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sync Targets Widget at Sidebar Bottom */}
          <div className="p-6 border-t border-border-subtle bg-bg-base/20 space-y-3">
            <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
              Connected Targets
            </div>
            
            {/* GitHub Widget */}
            <div className="flex items-center gap-2 text-xs">
              <GitPullRequest className="w-3.5 h-3.5 text-text-secondary" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-text-secondary block text-[10px]">GitHub Repository</span>
                {project?.githubRepo ? (
                  <span className="text-[11px] text-text-primary truncate block font-medium" title={project.githubRepo}>{project.githubRepo}</span>
                ) : (
                  <span className="text-[10px] text-text-tertiary italic block">Not linked</span>
                )}
              </div>
            </div>

            {/* Jira Widget */}
            <div className="flex items-center gap-2 text-xs">
              <Link2 className="w-3.5 h-3.5 text-blue-400" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-text-secondary block text-[10px]">Jira Project Key</span>
                {project?.jiraProjectKey ? (
                  <span className="text-[11px] text-text-primary block font-medium">Project: {project.jiraProjectKey}</span>
                ) : (
                  <span className="text-[10px] text-text-tertiary italic block">Not linked</span>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Panel Area */}
        <main className="flex-1 overflow-y-auto bg-bg-base/35 p-6 md:p-10 relative">
          <div className="max-w-6xl mx-auto h-full flex flex-col justify-between">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
