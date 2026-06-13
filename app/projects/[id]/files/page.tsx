'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  ExternalLink, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Copy, 
  Code, 
  Edit3 
} from 'lucide-react';
import { useProjectStore } from '@/lib/store/projectStore';
import { filesApi, sourceOfTruthApi } from '@/lib/api';

export default function FilesPage() {
  const router = useRouter();
  const { projectId, project, fetchProject, userId } = useProjectStore();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [extractingMermaidFileId, setExtractingMermaidFileId] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAppendingSoT, setIsAppendingSoT] = useState(false);

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
      await fetchProject(); // Refresh store
    } catch (err: any) {
      setError(err.message || 'Failed to rename file');
    } finally {
      setIsSavingRename(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !projectId) return;

    setUploading(true);
    setError(null);
    try {
      await filesApi.upload(projectId, userId, file);
      await fetchProject(); // Refresh store
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleExtractPdf = async (fileId: string) => {
    setIsExtracting(true);
    try {
      await filesApi.extractPdf(fileId);
      await fetchProject(); // Refresh store
      alert('Extraction complete! New files have been added to the project.');
    } catch (err: any) {
      setError(err.message || 'Failed to extract PDF');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAppendToSoT = async (fileId: string) => {
    if (!projectId) return;
    setIsAppendingSoT(true);
    try {
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
      alert('Appended to Source of Truth successfully! Go to Source of Truth tab to review.');
    } catch (err: any) {
      setError(err.message || 'Failed to append to Source of Truth');
    } finally {
      setIsAppendingSoT(false);
    }
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      await filesApi.delete(fileId);
      await fetchProject(); // Refresh store
    } catch (err: any) {
      setError(err.message || 'Failed to delete file');
    }
  };

  const handleExtractMermaid = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExtractingMermaidFileId(fileId);
    try {
      const response = await fetch(`/api/files/${fileId}/extract-mermaid`);
      if (!response.ok) throw new Error('Failed to extract Mermaid code');

      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }

      await fetchProject(); // Refresh store
    } catch (err: any) {
      setError(err.message || 'Failed to extract Mermaid code');
    } finally {
      setExtractingMermaidFileId(null);
    }
  };

  return (
    <div className="w-full animate-fade-in-up space-y-6">
      
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Project Resources</h1>
          <p className="text-sm text-text-tertiary mt-1">Upload software specifications, user requirements, or flow charts.</p>
        </div>

        <label className="group relative flex items-center gap-3 px-6 py-3 bg-accent-primary hover:bg-accent-hover text-white rounded-xl font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-primary/20">
          <Upload className="w-5 h-5" />
          <span>Upload Source</span>
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          {uploading && (
            <div className="absolute inset-0 bg-accent-hover/80 rounded-xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
        </label>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-status-error-glow border border-status-error/20 flex items-center gap-3 text-status-error animate-fade-in-up">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-bg-elevated rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid of Files */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {project?.files.map((file, idx) => (
          <div
            key={file.id}
            onClick={() => router.push(`/files/${file.id}`)}
            className="group relative bg-bg-surface border border-border-subtle rounded-2xl p-6 transition-all hover:bg-bg-elevated hover:border-accent-primary/30 hover:-translate-y-1 animate-fade-in-up cursor-pointer flex flex-col justify-between"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-bg-base flex items-center justify-center group-hover:bg-accent-subtle transition-colors">
                  {file.contentType.includes('image') ? (
                    <ImageIcon className="w-6 h-6 text-accent-primary" />
                  ) : (
                    <FileText className="w-6 h-6 text-accent-primary" />
                  )}
                </div>
                
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`/api/files/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-bg-base text-text-tertiary hover:text-text-primary hover:bg-bg-overlay transition-all"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => {
                      setRenameValue(getBaseName(file.originalName));
                      setRenamingFileId(file.id);
                    }}
                    className="p-1.5 rounded-lg bg-bg-base text-text-tertiary hover:text-accent-primary hover:bg-accent-subtle transition-all cursor-pointer"
                    title="Rename file"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteFile(file.id, e)}
                    className="p-1.5 rounded-lg bg-bg-base text-text-tertiary hover:text-status-error hover:bg-status-error-glow transition-all cursor-pointer"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {renamingFileId === file.id ? (
                <div className="flex items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
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
                    className="w-full px-2 py-1 bg-bg-base border border-accent-primary rounded-lg text-text-primary text-sm font-bold focus:outline-none"
                    autoFocus
                    disabled={isSavingRename}
                  />
                  <button
                    onClick={() => handleSaveRename(file.id)}
                    disabled={isSavingRename}
                    className="p-1 text-status-success"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setRenamingFileId(null)} className="p-1 text-text-tertiary">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h3 className="text-lg font-bold text-text-primary mb-1 truncate" title={getBaseName(file.originalName)}>
                  {getBaseName(file.originalName)}
                </h3>
              )}

              <p className="text-[10px] text-text-tertiary mb-4">
                {new Date(file.createdAt).toLocaleDateString()} • {file.contentType.split('/')[1].toUpperCase()}
              </p>
            </div>

            <div>
              {/* File Preview thumbnail */}
              <div className="h-32 w-full rounded-xl bg-bg-base overflow-hidden border border-border-subtle group-hover:border-accent-primary/20 transition-colors mb-4">
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

              {/* Extra Extraction Actions */}
              <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                {file.originalName.toLowerCase().endsWith('.pdf') && (
                  <button
                    onClick={() => handleExtractPdf(file.id)}
                    disabled={isExtracting}
                    className="w-full py-2 bg-accent-subtle hover:bg-accent-primary text-accent-primary hover:text-white border border-accent-primary/10 hover:border-accent-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    <span>Extract PDF to markdown</span>
                  </button>
                )}

                {file.contentType.includes('image') && !file.content && (
                  <button
                    onClick={(e) => handleExtractMermaid(file.id, e)}
                    disabled={extractingMermaidFileId === file.id}
                    className="w-full py-2 bg-accent-subtle hover:bg-accent-primary text-accent-primary hover:text-white border border-accent-primary/10 hover:border-accent-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    {extractingMermaidFileId === file.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-primary" />
                    ) : (
                      <Code className="w-3.5 h-3.5" />
                    )}
                    <span>OCR Flowchart to Mermaid</span>
                  </button>
                )}

                {file.content && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(file.content || '');
                        setCopiedFileId(file.id);
                        setTimeout(() => setCopiedFileId(null), 2000);
                      }}
                      className="flex-1 py-2 bg-bg-base hover:bg-bg-elevated border border-border-subtle text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                    >
                      {copiedFileId === file.id ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-status-success animate-scale-up" />
                          <span className="text-status-success">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-text-tertiary" />
                          <span>Copy Raw</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleAppendToSoT(file.id)}
                      disabled={isAppendingSoT}
                      className="flex-1 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                    >
                      {isAppendingSoT ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Append to SoT</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {project?.files.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed border-border-subtle rounded-3xl bg-bg-surface/30">
            <Upload className="w-12 h-12 text-text-tertiary mb-4 opacity-20" />
            <p className="text-text-secondary font-medium">No resources uploaded yet</p>
            <p className="text-text-tertiary text-xs max-w-xs text-center mt-1">Upload requirement documents or flowcharts to build your agile breakdown tree.</p>
          </div>
        )}
      </section>

    </div>
  );
}
