'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Image as ImageIcon, Trash2, ExternalLink, Plus, Loader2, CheckCircle2, AlertCircle, X, Copy, Code, Edit3 } from 'lucide-react';
import { projectsApi, filesApi, sourceOfTruthApi } from '@/lib/api';
import SourceOfTruthPanel from './SourceOfTruthPanel';
import WBSPanel from './WBSPanel';

interface FileMetadata {
  id: string;
  originalName: string;
  contentType: string;
  content?: string;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
  status: string;
  files: FileMetadata[];
}

export default function ProjectDashboard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAppendingSoT, setIsAppendingSoT] = useState(false);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [extractingMermaidFileId, setExtractingMermaidFileId] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      // For demo purposes we can fallback, but in real flow we should redirect
      setUserId('645a1b2c3d4e5f6a7b8c9d0e');
    } else {
      setUserId(storedUserId);
    }
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

  const getBaseName = (filename: string) => {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename;
    return filename.substring(0, lastDotIndex);
  };

  const handleSaveRename = async (fileId: string) => {
    if (!renameValue.trim()) return;
    setIsSavingRename(true);
    try {
      await filesApi.rename(fileId, renameValue.trim());
      setRenamingFileId(null);
      await fetchProject(); // Refresh the list
    } catch (err: any) {
      alert(err.message || 'Failed to rename file');
    } finally {
      setIsSavingRename(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('userId', userId);

    try {
      await filesApi.upload(projectId, userId, file);

      await fetchProject(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleExtractPdf = async (fileId: string) => {
    setIsExtracting(true);
    try {
      await filesApi.extractPdf(fileId);
      await fetchProject(); // Refresh to show new extracted files
      alert('Extraction complete! New files have been added to the project.');
    } catch (err: any) {
      alert(err.message || 'Failed to extract PDF');
    } finally {
      setIsExtracting(false);
    }
  };



  const handleAppendToSoT = async (fileId: string) => {
    setIsAppendingSoT(true);
    try {
      // Use pre-loaded content if available, otherwise fetch
      let textToAppend = '';
      const file = project?.files.find(f => f.id === fileId);

      if (file?.content) {
        textToAppend = file.content;
      } else {
        const fileData = await filesApi.getById(fileId);
        textToAppend = fileData.content || '';
      }

      let currentSot;
      try {
        currentSot = await sourceOfTruthApi.getByProjectId(projectId);
      } catch (err: any) {
        if (!err.message?.includes('404')) {
          throw err;
        }
      }

      if (currentSot) {
        await sourceOfTruthApi.update(projectId, currentSot.content + '\n\n' + textToAppend);
      } else {
        await sourceOfTruthApi.create(projectId, textToAppend);
      }
      alert('Appended to Source of Truth successfully! Check the Source of Truth panel below.');
    } catch (err: any) {
      alert(err.message || 'Failed to append to Source of Truth');
    } finally {
      setIsAppendingSoT(false);
    }
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the side panel

    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      await filesApi.delete(fileId);
      await fetchProject(); // Refresh the list
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleExtractMermaid = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExtractingMermaidFileId(fileId);
    try {
      const response = await fetch(`/api/files/${fileId}/extract-mermaid`);
      if (!response.ok) throw new Error('Failed to extract Mermaid code');

      // Consume the full stream to ensure the backend finishes saving
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }

      // Refresh the project to pick up the newly saved content
      await fetchProject();
    } catch (err: any) {
      alert(err.message || 'Failed to extract Mermaid code');
    } finally {
      setExtractingMermaidFileId(null);
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
    <div className="w-full px-6 md:px-10 lg:px-16 py-12 animate-fade-in-up">
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
            onClick={() => router.push(`/files/${file.id}`)}
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
              <div className="flex items-center gap-2">
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameValue(getBaseName(file.originalName));
                    setRenamingFileId(file.id);
                  }}
                  className="p-2 rounded-lg bg-bg-elevated text-text-tertiary hover:text-accent-primary hover:bg-accent-subtle transition-all cursor-pointer"
                  title="Rename file"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDeleteFile(file.id, e)}
                  className="p-2 rounded-lg bg-bg-elevated text-text-tertiary hover:text-status-error hover:bg-status-error-glow transition-all cursor-pointer"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {file.contentType.includes('image') && file.content && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(file.content || '');
                      setCopiedFileId(file.id);
                      setTimeout(() => setCopiedFileId(null), 2000);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      copiedFileId === file.id
                        ? 'bg-status-success-glow text-status-success'
                        : 'bg-bg-elevated text-text-tertiary hover:text-accent-primary hover:bg-accent-subtle'
                    }`}
                    title="Copy extracted content"
                  >
                    {copiedFileId === file.id ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
                {file.contentType.includes('image') && !file.content && (
                  <button
                    onClick={(e) => handleExtractMermaid(file.id, e)}
                    disabled={extractingMermaidFileId === file.id}
                    className="p-2 rounded-lg bg-bg-elevated text-text-tertiary hover:text-accent-primary hover:bg-accent-subtle transition-all disabled:opacity-50"
                    title="Convert diagram to Mermaid code"
                  >
                    {extractingMermaidFileId === file.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
                    ) : (
                      <Code className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {renamingFileId === file.id ? (
              <div className="flex items-center gap-2 mb-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      await handleSaveRename(file.id);
                    } else if (e.key === 'Escape') {
                      setRenamingFileId(null);
                    }
                  }}
                  className="w-full px-2 py-1 bg-bg-base border border-accent-primary rounded-lg text-text-primary text-sm font-bold focus:outline-none focus:ring-1 focus:ring-accent-primary"
                  autoFocus
                  disabled={isSavingRename}
                />
                <button
                  onClick={() => handleSaveRename(file.id)}
                  disabled={isSavingRename}
                  className="p-1 text-status-success hover:bg-bg-elevated rounded transition-colors cursor-pointer"
                >
                  {isSavingRename ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => setRenamingFileId(null)}
                  disabled={isSavingRename}
                  className="p-1 text-text-tertiary hover:bg-bg-elevated rounded transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <h3 className="text-lg font-bold text-text-primary mb-1 truncate" title={getBaseName(file.originalName)}>
                {getBaseName(file.originalName)}
              </h3>
            )}
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
                    Binary Data Stream<br />
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

      {/* Source of Truth Section */}
      <SourceOfTruthPanel projectId={projectId} />

      {/* Agile Work Breakdown Structure Tree */}
      <WBSPanel projectId={projectId} />

    </div>
  );
}
