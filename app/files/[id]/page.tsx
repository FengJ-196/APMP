'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FileText, 
  Image as ImageIcon, 
  ArrowLeft, 
  Download, 
  ExternalLink, 
  Loader2, 
  Save, 
  Edit3, 
  Database, 
  Layers,
  CheckCircle2,
  AlertCircle,
  Code,
  Copy,
  X,
  Sparkles,
  Check
} from 'lucide-react';
import { filesApi, sourceOfTruthApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface FileMetadata {
  id: string;
  projectId: string;
  originalName: string;
  contentType: string;
  content?: string;
  createdAt: string;
}

export default function FilePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const fileId = params.id as string;

  const [file, setFile] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [isSavingMarkdown, setIsSavingMarkdown] = useState(false);
  const [isAppendingSoT, setIsAppendingSoT] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isExtractingMermaid, setIsExtractingMermaid] = useState(false);
  const [mermaidCode, setMermaidCode] = useState('');
  const [showMermaidSidebar, setShowMermaidSidebar] = useState(false);
  
  const [isReformatting, setIsReformatting] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [reformattedContent, setReformattedContent] = useState('');

  useEffect(() => {
    if (fileId) {
      fetchFile();
    }
  }, [fileId]);

  const getBaseName = (filename: string) => {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename;
    return filename.substring(0, lastDotIndex);
  };

  const handleSaveRename = async () => {
    if (!file || !renameValue.trim()) return;
    setIsSavingRename(true);
    setError(null);
    try {
      const updated = await filesApi.rename(file.id, renameValue.trim());
      setFile(prev => prev ? { ...prev, originalName: updated.originalName } : null);
      setIsRenaming(false);
      showSuccess('File renamed successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to rename file');
    } finally {
      setIsSavingRename(false);
    }
  };

  const fetchFile = async () => {
    try {
      setLoading(true);
      const data = await filesApi.getById(fileId);
      setFile(data as any);
      if (data.content) {
        setMarkdownContent(data.content);
        setOriginalContent(data.content);
      }
    } catch (err: any) {
      setError(err.message || 'Could not load file details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractPdf = async () => {
    if (!file) return;
    setIsExtracting(true);
    try {
      await filesApi.extractPdf(file.id);
      showSuccess('Extraction complete! New files have been added to the project.');
      // After extraction, we might want to go back to the project page to see new files
    } catch (err: any) {
      setError(err.message || 'Failed to extract PDF');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveMarkdown = async () => {
    if (!file) return;
    setIsSavingMarkdown(true);
    try {
      await filesApi.updateContent(file.id, markdownContent);
      setIsEditingMarkdown(false);
      showSuccess('Markdown saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save markdown');
    } finally {
      setIsSavingMarkdown(false);
    }
  };

  const handleAppendToSoT = async () => {
    if (!file) return;
    setIsAppendingSoT(true);
    try {
      let textToAppend = markdownContent;
      
      let currentSot;
      try {
        currentSot = await sourceOfTruthApi.getByProjectId(file.projectId);
      } catch (err: any) {
        if (!err.message?.includes('404')) {
          throw err;
        }
      }

      if (currentSot) {
        await sourceOfTruthApi.update(file.projectId, currentSot.content + '\n\n' + textToAppend);
      } else {
        await sourceOfTruthApi.create(file.projectId, textToAppend);
      }
      showSuccess('Appended to Source of Truth successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to append to Source of Truth');
    } finally {
      setIsAppendingSoT(false);
    }
  };

  const handleExtractMermaid = async () => {
    if (!file) return;
    setIsExtractingMermaid(true);
    setMermaidCode('');
    setShowMermaidSidebar(true);
    
    try {
      const response = await fetch(`/api/files/${file.id}/extract-mermaid`);
      if (!response.ok) throw new Error('Failed to extract Mermaid code');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMermaidCode(prev => prev + chunk);
      }
      showSuccess('Mermaid code extracted successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to extract Mermaid code');
    } finally {
      setIsExtractingMermaid(false);
    }
  };

  const handleReformatMarkdown = async () => {
    if (!file) return;
    setIsReformatting(true);
    setIsCompareMode(true);
    setReformattedContent('');
    setError(null);
    try {
      const response = await fetch(`/api/files/${file.id}/reformat`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to reformat file contents.');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response stream is unavailable');

      const decoder = new TextDecoder();
      let runningText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        runningText += chunk;
        setReformattedContent(runningText);
      }

      showSuccess('AI Reformatting complete! Side-by-side compare is ready.');
    } catch (err: any) {
      setError(err.message || 'Failed to reformat file');
      setIsCompareMode(false);
    } finally {
      setIsReformatting(false);
    }
  };

  const handleAcceptFormatting = async () => {
    if (!file) return;
    setIsSavingMarkdown(true);
    try {
      setMarkdownContent(reformattedContent);
      setOriginalContent(reformattedContent);
      setFile(prev => prev ? { ...prev, content: reformattedContent } : null);
      setIsCompareMode(false);
      showSuccess('AI formatting accepted and saved!');
    } catch (err: any) {
      setError(err.message || 'Failed to accept changes');
    } finally {
      setIsSavingMarkdown(false);
    }
  };

  const handleDiscardFormatting = async () => {
    if (!file) return;
    setIsSavingMarkdown(true);
    try {
      await filesApi.updateContent(file.id, originalContent);
      setMarkdownContent(originalContent);
      setReformattedContent('');
      setIsCompareMode(false);
      showSuccess('AI formatting changes discarded.');
    } catch (err: any) {
      setError(err.message || 'Failed to discard changes');
    } finally {
      setIsSavingMarkdown(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4">
          <Loader2 className="w-10 h-10 text-accent-primary animate-spin" />
          <p className="text-text-secondary animate-pulse">Loading file preview...</p>
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="min-h-screen bg-bg-base">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-6 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-status-error-glow flex items-center justify-center text-status-error">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Error Loading File</h1>
            <p className="text-text-tertiary max-w-md">{error || 'The file you are looking for does not exist or you do not have permission to view it.'}</p>
            {error && (
              <div className="mt-4 p-3 bg-bg-surface border border-border-subtle rounded-lg text-xs font-mono text-text-secondary text-left overflow-auto max-w-md">
                Error Details: {error}
              </div>
            )}
          </div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-2 bg-bg-surface border border-border-subtle rounded-xl text-text-primary hover:bg-bg-elevated transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const isImage = file.contentType.includes('image');
  const isPdf = file.contentType === 'application/pdf';
  const isTextDocument = 
    file.contentType === 'text/markdown' || 
    file.contentType === 'text/plain' ||
    file.originalName.endsWith('.md') || 
    file.originalName.endsWith('.txt');

  return (
    <div className="h-screen bg-bg-base flex flex-col overflow-hidden">
      <Navbar />
      <div className="h-16 flex-shrink-0" /> {/* Spacer for fixed Navbar */}
      
      {/* Top Header/Toolbar */}
      <div className="bg-bg-surface border-b border-border-subtle transition-all">
        <div className="w-full px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${file.projectId}`}
              className="p-2 rounded-lg hover:bg-bg-elevated text-text-tertiary hover:text-text-primary transition-all"
              title="Back to project"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') setIsRenaming(false);
                    }}
                    className="px-3 py-1 bg-bg-base border border-accent-primary rounded-lg text-text-primary text-lg font-bold focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    autoFocus
                    disabled={isSavingRename}
                  />
                  <button
                    onClick={handleSaveRename}
                    disabled={isSavingRename}
                    className="p-1 hover:bg-bg-elevated rounded text-status-success disabled:opacity-50 cursor-pointer"
                    title="Save name"
                  >
                    {isSavingRename ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setIsRenaming(false)}
                    disabled={isSavingRename}
                    className="p-1 hover:bg-bg-elevated rounded text-text-tertiary hover:text-text-primary disabled:opacity-50 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h1 className="text-xl font-bold text-text-primary flex items-center gap-2 truncate max-w-md group">
                  {isImage ? <ImageIcon className="w-5 h-5 text-accent-primary" /> : <FileText className="w-5 h-5 text-accent-primary" />}
                  <span className="truncate">{getBaseName(file.originalName)}</span>
                  <button
                    onClick={() => {
                      setRenameValue(getBaseName(file.originalName));
                      setIsRenaming(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-bg-elevated rounded text-text-tertiary hover:text-text-primary transition-all cursor-pointer"
                    title="Rename file"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </h1>
              )}
              <p className="text-xs text-text-tertiary mt-0.5">
                {file.contentType} • {new Date(file.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {isCompareMode ? (
              <>
                <button
                  onClick={handleDiscardFormatting}
                  disabled={isSavingMarkdown}
                  className="flex items-center gap-2 px-4 py-2 bg-bg-surface border border-status-error/30 text-status-error text-sm font-semibold rounded-lg hover:bg-bg-elevated transition-all disabled:opacity-50"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleAcceptFormatting}
                  disabled={isSavingMarkdown || !reformattedContent}
                  className="flex items-center gap-2 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-status-success/20"
                >
                  {isSavingMarkdown ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Accept Changes
                </button>
              </>
            ) : (
              <>
                {isPdf && (
                  <button 
                    onClick={handleExtractPdf} 
                    disabled={isExtracting}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                    {isExtracting ? 'Extracting...' : 'Extract Assets'}
                  </button>
                )}

                {isImage && (
                  <button 
                    onClick={handleExtractMermaid} 
                    disabled={isExtractingMermaid}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {isExtractingMermaid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4" />}
                    {isExtractingMermaid ? 'Extracting...' : 'Extract Mermaid'}
                  </button>
                )}

                {isTextDocument && !isEditingMarkdown && (
                  <>
                    <button 
                      onClick={() => setIsEditingMarkdown(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-bg-surface border border-border-subtle text-text-primary text-sm font-semibold rounded-lg hover:bg-bg-elevated transition-all"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Markdown
                    </button>
                    <button 
                      onClick={handleReformatMarkdown}
                      disabled={isReformatting}
                      className="flex items-center gap-2 px-4 py-2 bg-bg-surface border border-accent-primary/20 text-text-primary text-sm font-semibold rounded-lg hover:bg-bg-elevated transition-all disabled:opacity-50"
                    >
                      {isReformatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-accent-primary animate-pulse" />}
                      {isReformatting ? 'Formatting...' : 'Reformat with AI'}
                    </button>
                    <button 
                      onClick={handleAppendToSoT}
                      disabled={isAppendingSoT}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
                    >
                      {isAppendingSoT ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                      {isAppendingSoT ? 'Appending...' : 'Append to SoT'}
                    </button>
                  </>
                )}
              </>
            )}

            {isTextDocument && isEditingMarkdown && (
              <button 
                onClick={handleSaveMarkdown}
                disabled={isSavingMarkdown}
                className="flex items-center gap-2 px-4 py-2 bg-status-success hover:opacity-90 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {isSavingMarkdown ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSavingMarkdown ? 'Saving...' : 'Save Changes'}
              </button>
            )}

            <a 
              href={`/api/files/${file.id}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-bg-base border border-border-subtle text-text-tertiary hover:text-accent-primary hover:bg-accent-subtle transition-all"
              title="Open raw file"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            
            <a 
              href={`/api/files/${file.id}`}
              download={file.originalName}
              className="p-2 rounded-lg bg-bg-base border border-border-subtle text-text-tertiary hover:text-accent-primary hover:bg-accent-subtle transition-all"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Preview Area */}
      <main className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {successMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up">
              <div className="flex items-center gap-2 px-4 py-2 bg-status-success-glow border border-status-success/20 text-status-success rounded-full shadow-lg backdrop-blur-md">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">{successMessage}</span>
              </div>
            </div>
          )}

          <div className="flex-1 w-full bg-bg-base">
            {isCompareMode ? (
              <div className="h-full flex flex-col md:flex-row gap-6 p-6 overflow-hidden">
                {/* Left Side: Original */}
                <div className="flex-1 flex flex-col bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-2xl relative">
                  <div className="px-5 py-3.5 bg-bg-elevated border-b border-border-subtle flex justify-between items-center">
                    <span className="text-xs font-bold text-text-secondary flex items-center gap-2">
                      📄 Original Requirement Text
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">
                      Read Only
                    </span>
                  </div>
                  <textarea
                    value={originalContent}
                    readOnly
                    className="flex-1 p-6 bg-bg-surface text-text-secondary font-mono text-sm resize-none focus:outline-none overflow-y-auto leading-relaxed"
                  />
                </div>

                {/* Right Side: AI Formatted */}
                <div className="flex-1 flex flex-col bg-bg-surface border border-accent-primary/20 rounded-2xl overflow-hidden shadow-2xl relative">
                  <div className="px-5 py-3.5 bg-bg-elevated border-b border-border-subtle flex justify-between items-center">
                    <span className="text-xs font-bold text-[#10B981] flex items-center gap-2">
                      ✨ AI Restructured Markdown {isReformatting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    </span>
                    {isReformatting && (
                      <span className="text-[10px] text-[#10B981] font-mono animate-pulse">
                        Streaming Live Chunks...
                      </span>
                    )}
                  </div>
                  <textarea
                    value={reformattedContent}
                    readOnly
                    className="flex-1 p-6 bg-[#0B1120] text-text-primary font-mono text-sm resize-none focus:outline-none overflow-y-auto leading-relaxed shadow-inner"
                    placeholder="AI is structuring, formatting, and refining your text in real time..."
                  />
                </div>
              </div>
            ) : isTextDocument && isEditingMarkdown ? (
              <div className="h-full p-6 md:p-10 w-full mx-auto">
                <textarea
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  className="w-full h-full p-8 rounded-2xl bg-bg-surface border border-border-subtle resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-primary font-mono text-base shadow-xl"
                  placeholder="Edit your markdown here..."
                  spellCheck={false}
                />
              </div>
            ) : isImage ? (
              <div className="h-full flex items-center justify-center p-6 md:p-12 overflow-auto bg-grid-pattern">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                  <img 
                    src={`/api/files/${file.id}`} 
                    alt={file.originalName}
                    className="relative max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-border-subtle bg-white"
                  />
                </div>
              </div>
            ) : isPdf ? (
              <div className="flex-1 h-full flex flex-col">
                <iframe 
                  src={`/api/files/${file.id}`}
                  className="w-full h-full border-none bg-white"
                  title={file.originalName}
                />
              </div>
            ) : isTextDocument ? (
              <div className="h-full p-6 md:p-10 w-full mx-auto overflow-hidden flex flex-col">
                <div className="flex-1 rounded-2xl bg-bg-surface border border-border-subtle shadow-xl overflow-hidden flex flex-col">
                  <div className="px-5 py-3 bg-bg-elevated border-b border-border-subtle flex items-center justify-between">
                    <span className="text-xs font-bold text-text-secondary flex items-center gap-2">
                      📄 {getBaseName(file.originalName)}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">
                      Read Only
                    </span>
                  </div>
                  <pre className="flex-1 p-6 md:p-8 overflow-auto text-text-primary font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {markdownContent || '(No content available)'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-text-tertiary p-10 text-center">
                <div className="w-24 h-24 rounded-3xl bg-bg-surface flex items-center justify-center mb-6">
                  <FileText className="w-12 h-12 opacity-30" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">No Preview Available</h2>
                <p className="max-w-md mb-8">The browser cannot display a live preview of this file type ({file.contentType}). You can download it to view locally.</p>
                <a 
                  href={`/api/files/${file.id}`}
                  download={file.originalName}
                  className="px-8 py-3 bg-accent-primary hover:bg-accent-hover text-white rounded-xl font-bold transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-accent-primary/20 flex items-center gap-2"
                >
                  <Download className="w-5 h-5" /> Download File
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Mermaid Sidebar */}
        {showMermaidSidebar && (
          <div className="w-[450px] border-l border-border-subtle bg-bg-surface flex flex-col animate-fade-in-up z-40">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-bg-elevated">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Code className="w-4 h-4 text-accent-primary" />
                Extracted Mermaid Code
              </h2>
              <button onClick={() => setShowMermaidSidebar(false)} className="p-1 hover:bg-bg-overlay rounded-md transition-colors">
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto bg-bg-base/50 font-mono text-xs leading-relaxed text-text-secondary">
              <pre className="whitespace-pre-wrap">{mermaidCode || (isExtractingMermaid ? 'Analyzing diagram...' : '')}</pre>
            </div>
            <div className="p-4 border-t border-border-subtle bg-bg-elevated flex items-center gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(mermaidCode);
                  showSuccess('Copied to clipboard!');
                }}
                className="flex-1 py-2 px-4 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-primary hover:bg-bg-overlay transition-all flex items-center justify-center gap-2"
              >
                <Copy className="w-3 h-3" /> Copy Code
              </button>
              <button 
                onClick={async () => {
                  try {
                    setIsAppendingSoT(true);
                    let currentSot;
                    try {
                      currentSot = await sourceOfTruthApi.getByProjectId(file.projectId);
                    } catch (err: any) {
                      if (!err.message?.includes('404')) throw err;
                    }

                    if (currentSot) {
                      await sourceOfTruthApi.update(file.projectId, currentSot.content + '\n\n```mermaid\n' + mermaidCode + '\n```');
                    } else {
                      await sourceOfTruthApi.create(file.projectId, '```mermaid\n' + mermaidCode + '\n```');
                    }
                    showSuccess('Appended to Source of Truth!');
                  } catch (err: any) {
                    setError(err.message || 'Failed to append to SoT');
                  } finally {
                    setIsAppendingSoT(false);
                  }
                }}
                disabled={isAppendingSoT || !mermaidCode}
                className="flex-1 py-2 px-4 bg-accent-primary text-white rounded-lg text-xs font-bold hover:bg-accent-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAppendingSoT ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                Append to SoT
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
