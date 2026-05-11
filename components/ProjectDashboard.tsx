'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Image as ImageIcon, Trash2, ExternalLink, Plus, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { projectsApi, filesApi } from '@/lib/api';

interface FileMetadata {
  id: string;
  originalName: string;
  contentType: string;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
  status: string;
  files: FileMetadata[];
}

export default function ProjectDashboard({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);

  // Mock userId - in a real app, this would come from an auth session
  const mockUserId = '645a1b2c3d4e5f6a7b8c9d0e';

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const data = await projectsApi.getById(projectId);
      setProject(data as any);
    } catch (err) {
      setError('Could not load project details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('userId', mockUserId);

    try {
      await filesApi.upload(projectId, mockUserId, file);

      await fetchProject(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-accent-primary animate-spin" />
        <p className="text-text-secondary animate-pulse">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in-up">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-full bg-accent-subtle border border-accent-primary/20 text-[10px] font-bold text-accent-primary uppercase tracking-widest">
              {project?.status || 'Active'}
            </span>
            <span className="text-text-tertiary text-sm">Project ID: {projectId}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
            {project?.title}
          </h1>
        </div>

        <label className="group relative flex items-center gap-3 px-6 py-3 bg-accent-primary hover:bg-accent-hover text-white rounded-xl font-semibold cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-accent-primary/20">
          <Upload className="w-5 h-5" />
          <span>Upload Source</span>
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          {uploading && (
            <div className="absolute inset-0 bg-accent-hover/80 rounded-xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
        </label>
      </header>

      {error && (
        <div className="mb-8 p-4 rounded-xl bg-status-error-glow border border-status-error/20 flex items-center gap-3 text-status-error animate-fade-in-up">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {project?.files.map((file, idx) => (
          <div
            key={file.id}
            onClick={() => setSelectedFile(file)}
            className="group relative bg-bg-surface border border-border-subtle rounded-2xl p-6 transition-all hover:bg-bg-elevated hover:border-accent-primary/30 hover:-translate-y-1 animate-fade-in-up cursor-pointer"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center group-hover:bg-accent-subtle transition-colors">
                {file.contentType.includes('image') ? (
                  <ImageIcon className="w-6 h-6 text-accent-primary" />
                ) : (
                  <FileText className="w-6 h-6 text-accent-primary" />
                )}
              </div>
              <a
                href={`/api/files/${file.id}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg bg-bg-elevated text-text-tertiary hover:text-text-primary hover:bg-bg-overlay transition-all"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <h3 className="text-lg font-bold text-text-primary mb-1 truncate" title={file.originalName}>
              {file.originalName}
            </h3>
            <p className="text-xs text-text-tertiary mb-4">
              {new Date(file.createdAt).toLocaleDateString()} • {file.contentType.split('/')[1].toUpperCase()}
            </p>

            <div className="h-32 w-full rounded-xl bg-bg-base overflow-hidden border border-border-subtle group-hover:border-accent-primary/20 transition-colors">
              {file.contentType.includes('image') ? (
                <img
                  src={`/api/files/${file.id}`}
                  alt={file.originalName}
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-bg-surface/50">
                   <div className="text-[10px] font-mono text-text-tertiary uppercase tracking-tighter text-center px-4 opacity-40">
                      Binary Data Stream<br/>
                      {file.id.substring(0, 12)}...
                   </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {project?.files.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-border-subtle rounded-3xl bg-bg-surface/30">
            <Upload className="w-12 h-12 text-text-tertiary mb-4 opacity-20" />
            <p className="text-text-secondary font-medium">No sources uploaded yet</p>
            <p className="text-text-tertiary text-sm">Upload your first SRS or diagram to begin analysis</p>
          </div>
        )}
      </section>

      {/* Slide-out File Viewer Panel */}
      {selectedFile && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => setSelectedFile(null)} 
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-3xl bg-bg-surface border-l border-border-subtle shadow-2xl z-50 flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between p-6 border-b border-border-subtle bg-bg-elevated">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{selectedFile.originalName}</h2>
                <p className="text-sm text-text-tertiary mt-1">
                  {selectedFile.contentType} • {new Date(selectedFile.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`/api/files/${selectedFile.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-bg-base border border-border-subtle text-text-secondary hover:text-accent-primary hover:border-accent-primary/50 hover:bg-accent-subtle transition-all"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2.5 rounded-xl bg-bg-base border border-border-subtle text-text-secondary hover:text-status-error hover:border-status-error/50 hover:bg-status-error-glow transition-all"
                  title="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden bg-bg-base relative">
              {selectedFile.contentType.includes('image') ? (
                <div className="absolute inset-0 flex items-center justify-center p-8 overflow-auto">
                  <img 
                    src={`/api/files/${selectedFile.id}`} 
                    alt={selectedFile.originalName} 
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-border-subtle"
                  />
                </div>
              ) : selectedFile.contentType === 'application/pdf' || selectedFile.contentType === 'text/markdown' ? (
                <iframe 
                  src={`/api/files/${selectedFile.id}`} 
                  className="w-full h-full border-none bg-white"
                  title={selectedFile.originalName}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-text-tertiary p-6 text-center">
                  <FileText className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg text-text-secondary font-medium">Preview not available</p>
                  <p className="mt-2">This file type cannot be previewed directly in the browser.</p>
                  <a 
                    href={`/api/files/${selectedFile.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 auth-btn-primary px-6 py-2 rounded-lg"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
