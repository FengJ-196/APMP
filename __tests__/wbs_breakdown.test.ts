import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { WBSItemService } from '../lib/services/WBSItemService';
import { ExportService } from '../lib/github/ExportService';
import { buildDeveloperSubtaskBreakdownPrompt } from '../lib/ai/prompts';
import { AIService } from '../lib/ai';
import WBSItemModel from '../lib/models/WBSItem';
import { GET, PUT } from '../app/api/projects/[id]/wbs/config/route';
import { POST } from '../app/api/wbs/[id]/breakdown/route';

// 1. Mock the DB connector
vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// 2. In-memory data stores
let inMemoryWBSItems: any[] = [];
let inMemoryWBSConfigs: Record<string, any> = {};
let inMemorySourceOfTruths: Record<string, any> = {};

// 3. Mock the DB Models
vi.mock('../lib/models/WBSItem', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/models/WBSItem')>();
  return {
    ...original,
    default: {
      findById: vi.fn(async (id: string) => {
        return inMemoryWBSItems.find(item => item._id.toString() === id);
      }),
      find: vi.fn((query: any) => {
        let results = [...inMemoryWBSItems];
        if (query.projectId) {
          results = results.filter(item => item.projectId.toString() === query.projectId.toString());
        }
        if (query.parentId) {
          results = results.filter(item => item.parentId?.toString() === query.parentId.toString());
        }
        if (query.type) {
          results = results.filter(item => item.type === query.type);
        }
        return {
          sort: vi.fn(() => ({
            lean: vi.fn().mockResolvedValue(results),
          })),
          lean: vi.fn().mockResolvedValue(results),
        };
      }),
      deleteMany: vi.fn(async (query: any) => {
        const initialLength = inMemoryWBSItems.length;
        if (query.parentId) {
          inMemoryWBSItems = inMemoryWBSItems.filter(
            item => !(item.parentId?.toString() === query.parentId.toString() && item.type === query.type)
          );
        }
        return { deletedCount: initialLength - inMemoryWBSItems.length };
      }),
      create: vi.fn(async (docs: any[]) => {
        const created = docs.map(doc => ({
          _id: new mongoose.Types.ObjectId(),
          ...doc,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        inMemoryWBSItems.push(...created);
        return created;
      }),
    },
  };
});

vi.mock('../lib/models/Estimation', () => ({
  StoryPoint: {
    findOne: vi.fn().mockResolvedValue(undefined),
  },
  ExternalSync: {
    findOneAndUpdate: vi.fn().mockResolvedValue({ syncStatus: 'synced' }),
  },
}));

// 4. Mock the service layer dependencies
vi.mock('../lib/services/WBSConfigService', () => ({
  WBSConfigService: {
    getWBSConfigByProjectId: vi.fn(async (projectId: string) => {
      return inMemoryWBSConfigs[projectId];
    }),
  },
}));

vi.mock('../lib/services/SourceOfTruthService', () => ({
  SourceOfTruthService: {
    getSourceOfTruthByProjectId: vi.fn(async (projectId: string) => {
      return inMemorySourceOfTruths[projectId];
    }),
  },
}));

// 5. Mock the AIService
vi.mock('../lib/ai', () => {
  const mockAIServiceInstance = {
    generateDeveloperSubtasks: vi.fn(),
  };
  return {
    AIService: {
      getInstance: vi.fn().mockReturnValue(mockAIServiceInstance),
    },
  };
});

// Mock global fetch for GitHub exports
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ number: 42, html_url: 'https://github.com/test/repo/issues/42' }),
});
global.fetch = mockFetch;

describe('Developer Subtask Breakdown & GitHub Export Integration', () => {
  const projectId = new mongoose.Types.ObjectId().toString();
  const taskId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryWBSItems = [];
    inMemoryWBSConfigs = {};
    inMemorySourceOfTruths = {};

    // Seed parent task
    inMemoryWBSItems.push({
      _id: new mongoose.Types.ObjectId(taskId),
      projectId: new mongoose.Types.ObjectId(projectId),
      title: 'Implement OAuth callback handler',
      description: 'Exchange temporary code for JWT token.',
      type: 'task',
      status: 'ai_generated',
      acceptanceCriteria: ['Handles code exchanges', 'Handles error cookies'],
      sourceRequirements: ['REQ-2.1'],
      order: 1,
      aiGenerated: true,
    });
  });

  /* ==========================================
   * 1. PROMPT BUILDER UNIT TESTS
   * ========================================== */
  describe('Prompt Builder', () => {
    it('should inject task details, technology stack, compliance, and integrations cleanly', () => {
      const task = {
        title: 'Build checkout process',
        description: 'Secure credit card checkout.',
        acceptanceCriteria: ['Saves order history', 'Throws 400 for empty cart'],
        sourceRequirements: ['REQ-5.1'],
      };

      const config = {
        techStack: {
          languages: ['TypeScript'],
          frameworks: ['Next.js'],
          databases: ['PostgreSQL'],
          cloud: ['Vercel'],
        },
        teamComposition: '2 Backend Developers',
        compliance: ['PCI-DSS'],
        integrations: ['Stripe'],
      };

      const sourceOfTruth = '# Requirement Document\nREQ-5.1: Secure checkout with Stripe.';

      const prompt = buildDeveloperSubtaskBreakdownPrompt(task, config, sourceOfTruth);

      expect(prompt).toContain('Build checkout process');
      expect(prompt).toContain('Secure credit card checkout.');
      expect(prompt).toContain('TypeScript');
      expect(prompt).toContain('Next.js');
      expect(prompt).toContain('PostgreSQL');
      expect(prompt).toContain('PCI-DSS');
      expect(prompt).toContain('Stripe');
      expect(prompt).toContain('# Requirement Document');
    });
  });

  /* ==========================================
   * 2. SERVICE LAYER UNIT & INTEGRATION TESTS
   * ========================================== */
  describe('WBSItemService breakdownTaskToSubtasks', () => {
    it('should throw an error if task ID does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        WBSItemService.breakdownTaskToSubtasks(fakeId)
      ).rejects.toThrow(/not found/);
    });

    it('should throw an error if attempting to break down an epic', async () => {
      const epicId = new mongoose.Types.ObjectId().toString();
      inMemoryWBSItems.push({
        _id: new mongoose.Types.ObjectId(epicId),
        projectId: new mongoose.Types.ObjectId(projectId),
        title: 'Core Authentication Module',
        type: 'epic',
      });

      await expect(
        WBSItemService.breakdownTaskToSubtasks(epicId)
      ).rejects.toThrow(/directly on an Epic/);
    });

    it('should decompose tasks successfully, deleting old subtasks and populating new ones', async () => {
      // 1. Seed old subtask to verify overwrite behavior
      inMemoryWBSItems.push({
        _id: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(projectId),
        parentId: new mongoose.Types.ObjectId(taskId),
        title: 'Old placeholder subtask',
        type: 'subtask',
      });

      // 2. Mock AI returned subtasks
      const mockSubtasks = [
        { title: 'Add oauth package dependency', description: 'Run npm i oauth.' },
        { title: 'Write token exchange callback API', description: 'Create file app/api/callback/route.ts.' },
      ];
      const aiService = AIService.getInstance();
      vi.spyOn(aiService, 'generateDeveloperSubtasks').mockResolvedValue(mockSubtasks);

      // 3. Trigger breakdown
      const result = await WBSItemService.breakdownTaskToSubtasks(taskId);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Add oauth package dependency');
      expect(result[1].description).toBe('Create file app/api/callback/route.ts.');

      // 4. Assert that old subtask is completely overwritten in memory database
      const staleSubtask = inMemoryWBSItems.find(item => item.title === 'Old placeholder subtask');
      expect(staleSubtask).toBeUndefined();

      const newDocs = inMemoryWBSItems.filter(item => item.parentId?.toString() === taskId);
      expect(newDocs).toHaveLength(2);
    });

    it('B7 & B8: should fetch and include WBSConfig and Source of Truth contexts in the AI generation call', async () => {
      // 1. Seed custom config and source of truth content in our mocks
      const customConfig = {
        techStack: {
          languages: ['TypeScript', 'Go'],
          frameworks: ['Next.js'],
          databases: ['MongoDB'],
          cloud: ['AWS'],
        },
        teamComposition: '2 Fullstack Devs',
        compliance: ['HIPAA'],
        integrations: ['Auth0'],
      };
      
      const customSoT = {
        content: '# Requirements Specification\nREQ-2.1: Authentication must use Auth0 and HIPAA compliant storage.',
      };

      inMemoryWBSConfigs[projectId] = customConfig;
      inMemorySourceOfTruths[projectId] = customSoT;

      // 2. Setup AI service spy
      const aiService = AIService.getInstance();
      const aiSpy = vi.spyOn(aiService, 'generateDeveloperSubtasks').mockResolvedValue([]);

      // 3. Trigger breakdown
      await WBSItemService.breakdownTaskToSubtasks(taskId);

      // 4. Assert that the AI service was called with the seeded config and source of truth content
      expect(aiSpy).toHaveBeenCalled();
      const callArgs = aiSpy.mock.calls[0];
      expect(callArgs[0].title).toBe('Implement OAuth callback handler');
      expect(callArgs[1]).toEqual(customConfig);
      expect(callArgs[2]).toBe('# Requirements Specification\nREQ-2.1: Authentication must use Auth0 and HIPAA compliant storage.');
    });
  });

  describe('WBSItemService generateWBSForProject', () => {
    it('should generate, hierarchically link, and save Epics, Stories, and Tasks from Source of Truth successfully', async () => {
      // 1. Seed custom config and source of truth content in our mocks
      const customConfig = {
        techStack: {
          languages: ['TypeScript'],
          frameworks: ['Next.js'],
        },
      };
      
      const customSoT = {
        id: new mongoose.Types.ObjectId().toString(),
        content: '# Requirements Specification\nVerify User Login.',
      };

      inMemoryWBSConfigs[projectId] = customConfig;
      inMemorySourceOfTruths[projectId] = customSoT;

      // 2. Mock AI WBS generation output
      const mockWBS = [
        {
          tempId: 'epic-auth',
          parentTempId: null,
          title: 'Authentication Epic',
          description: 'Epic description',
          type: 'epic',
          acceptanceCriteria: [],
          sourceRequirements: ['REQ-1'],
        },
        {
          tempId: 'story-login',
          parentTempId: 'epic-auth',
          title: 'As a user I want to login',
          description: 'Story description',
          type: 'story',
          acceptanceCriteria: [],
          sourceRequirements: ['REQ-1'],
        },
        {
          tempId: 'task-oauth',
          parentTempId: 'story-login',
          title: 'Setup Auth0',
          description: 'Task description',
          type: 'task',
          acceptanceCriteria: [],
          sourceRequirements: ['REQ-1'],
        }
      ];

      const aiService = AIService.getInstance();
      vi.spyOn(aiService, 'generateWBS').mockResolvedValue(mockWBS);

      // 3. Trigger WBS generation
      const result = await WBSItemService.generateWBSForProject(projectId);

      // 4. Assertions
      expect(result).toHaveLength(3);
      
      const epic = result.find(i => i.type === 'epic');
      const story = result.find(i => i.type === 'story');
      const task = result.find(i => i.type === 'task');

      expect(epic).toBeDefined();
      expect(story).toBeDefined();
      expect(task).toBeDefined();

      expect(story?.parentId).toBe(epic?.id);
      expect(task?.parentId).toBe(story?.id);
    });
  });

  /* ==========================================
   * 3. NEXT.JS 15 REST API ROUTE TESTS
   * ========================================== */
  describe('POST API Route', () => {
    it('should return 400 when task ID is missing or invalid', async () => {
      const req = new NextRequest('http://localhost/api/wbs/invalid-id/breakdown', { method: 'POST' });
      const res = await POST(req, { params: Promise.resolve({ id: '' }) });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('WBS Task ID is required');
    });

    it('should successfully decompose task and return status 200 with subtasks list', async () => {
      const mockSubtasks = [
        { title: 'Mock Subtask 1', description: 'Desc 1' }
      ];
      const aiService = AIService.getInstance();
      vi.spyOn(aiService, 'generateDeveloperSubtasks').mockResolvedValue(mockSubtasks);

      const req = new NextRequest(`http://localhost/api/wbs/${taskId}/breakdown`, { method: 'POST' });
      const res = await POST(req, { params: Promise.resolve({ id: taskId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe('Mock Subtask 1');
      expect(body[0].parentId).toBe(taskId);
    });
  });

  /* ==========================================
   * 4. GITHUB EXPORT SERVICE ENHANCEMENT TESTS
   * ========================================== */
  describe('GitHub ExportService Enhancements', () => {
    it('should omit checklists when no child subtasks are supplied', () => {
      const wbsItem = {
        title: 'Verify SSO Tokens',
        description: 'SSO validation logic.',
        type: 'task',
        acceptanceCriteria: [],
        sourceRequirements: [],
      };

      const markdown = ExportService.formatWBSItemToMarkdown(wbsItem, undefined, []);

      expect(markdown).not.toContain('## Developer Tasks Checklist');
    });

    it('should render child Level 4 subtasks as Markdown interactive checklists', () => {
      const wbsItem = {
        title: 'Verify SSO Tokens',
        description: 'SSO validation logic.',
        type: 'task',
        acceptanceCriteria: [],
        sourceRequirements: [],
      };

      const subtasks = [
        { title: 'Add jose JWT library', description: 'Run npm install jose.' },
        { title: 'Configure env secrets', description: 'Update local environment settings.' },
      ];

      const markdown = ExportService.formatWBSItemToMarkdown(wbsItem, undefined, subtasks);

      expect(markdown).toContain('## Developer Tasks Checklist');
      expect(markdown).toContain('- [ ] **Add jose JWT library** - Run npm install jose.');
      expect(markdown).toContain('- [ ] **Configure env secrets** - Update local environment settings.');
    });

    it('should fetch and embed subtasks checklist dynamically inside exportWBSItemToGitHub', async () => {
      // 1. Seed subtasks into database
      inMemoryWBSItems.push(
        {
          _id: new mongoose.Types.ObjectId(),
          projectId: new mongoose.Types.ObjectId(projectId),
          parentId: new mongoose.Types.ObjectId(taskId),
          title: 'Install Stripe SDK',
          description: 'npm install stripe',
          type: 'subtask',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          projectId: new mongoose.Types.ObjectId(projectId),
          parentId: new mongoose.Types.ObjectId(taskId),
          title: 'Add Stripe Webhook route',
          description: 'Create API stripe webhook handler.',
          type: 'subtask',
        }
      );

      // 2. Trigger GitHub export
      await ExportService.exportWBSItemToGitHub(taskId, 'owner', 'repo', 'token');

      // 3. Verify that fetch body includes formatted checklist items
      expect(mockFetch).toHaveBeenCalled();
      const lastCallArgs = mockFetch.mock.calls[0];
      const fetchUrl = lastCallArgs[0];
      const fetchOptions = lastCallArgs[1];

      expect(fetchUrl).toBe('https://api.github.com/repos/owner/repo/issues');
      
      const payload = JSON.parse(fetchOptions.body);
      expect(payload.title).toContain('Implement OAuth callback handler');
      expect(payload.body).toContain('## Developer Tasks Checklist');
      expect(payload.body).toContain('- [ ] **Install Stripe SDK** - npm install stripe');
      expect(payload.body).toContain('- [ ] **Add Stripe Webhook route** - Create API stripe webhook handler.');
    });
  });
});
