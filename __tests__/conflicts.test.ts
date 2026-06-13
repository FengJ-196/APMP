import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/projects/[id]/conflicts/route';
import { SourceOfTruthService } from '../lib/services/SourceOfTruthService';
import { FileService } from '../lib/services/FileService';
import { AIService } from '../lib/ai';
import { NextRequest } from 'next/server';

// Mock DB connector
vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// Mock Database Services
vi.mock('../lib/services/SourceOfTruthService', () => {
  return {
    SourceOfTruthService: {
      getSourceOfTruthByProjectId: vi.fn(),
    },
  };
});

vi.mock('../lib/services/FileService', () => {
  return {
    FileService: {
      getFilesByProjectId: vi.fn(),
      getFilesMetaWithContent: vi.fn(),
    },
  };
});

// Mock AI Service Core
vi.mock('../lib/ai', () => {
  const mockAIServiceInstance = {
    analyzeConflicts: vi.fn(),
    analyzeConflictsStream: vi.fn(),
  };
  return {
    AIService: {
      getInstance: vi.fn().mockReturnValue(mockAIServiceInstance),
    },
  };
});

function createMockRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/projects/proj-123/conflicts', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

describe('Conflicts and Ambiguity Detection API Route', () => {
  const projectId = 'proj-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 if the project has no Source of Truth', async () => {
    vi.spyOn(SourceOfTruthService, 'getSourceOfTruthByProjectId').mockResolvedValue(undefined);

    const request = createMockRequest();
    const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('Source of Truth has not been defined');
  });

  it('should return 404 if Source of Truth has empty content', async () => {
    vi.spyOn(SourceOfTruthService, 'getSourceOfTruthByProjectId').mockResolvedValue({
      id: 'sot-1',
      projectId,
      content: '',
      versionNumber: 1,
      versionHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = createMockRequest();
    const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('Source of Truth has not been defined');
  });

  it('should run conflict analysis successfully with streaming response', async () => {
    // 1. Mock valid Source of Truth
    vi.spyOn(SourceOfTruthService, 'getSourceOfTruthByProjectId').mockResolvedValue({
      id: 'sot-1',
      projectId,
      content: '# System Requirements Specification\nRule 1: MFA is mandatory for admin users.',
      versionNumber: 1,
      versionHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Mock AI Service Analyze Conflicts response
    const mockConflictReports = [
      {
        id: 'CF-1',
        type: 'Contradiction',
        severity: 'High',
        description: 'MFA logic contradiction',
        sourceReferences: {
          textSnippets: ['MFA is mandatory for admin users.'],
          imageIds: [],
        },
        llmExplanation: 'The flowchart logic allows authentication to proceed while bypassing MFA, directly contradicting mandatory MFA rules stated in the textual spec.',
        suggestedFix: 'Update the flowchart to enforce MFA verification immediately after credential checks.',
      },
    ];

    async function* mockStream() {
      yield JSON.stringify(mockConflictReports);
    }

    const aiInstance = AIService.getInstance();
    vi.spyOn(aiInstance, 'analyzeConflictsStream').mockReturnValue(mockStream() as any);

    const request = createMockRequest();
    const response = await POST(request, { params: Promise.resolve({ id: projectId }) });

    expect(response.status).toBe(200);

    // Read streamed chunks
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let resultText = '';
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      resultText += decoder.decode(value);
    }

    const body = JSON.parse(resultText);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('CF-1');
    expect(body[0].type).toBe('Contradiction');
    expect(body[0].severity).toBe('High');

    expect(aiInstance.analyzeConflictsStream).toHaveBeenCalledWith(
      '# System Requirements Specification\nRule 1: MFA is mandatory for admin users.',
      []
    );
  });

  it('should return 500 status code when AI service throws a runtime exception', async () => {
    vi.spyOn(SourceOfTruthService, 'getSourceOfTruthByProjectId').mockResolvedValue({
      id: 'sot-1',
      projectId,
      content: '# Spec text',
      versionNumber: 1,
      versionHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const aiInstance = AIService.getInstance();
    vi.spyOn(aiInstance, 'analyzeConflictsStream').mockImplementation(() => {
      throw new Error('Gemini API quota exceeded');
    });

    const request = createMockRequest();
    const response = await POST(request, { params: Promise.resolve({ id: projectId }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Gemini API quota exceeded');
  });
});
