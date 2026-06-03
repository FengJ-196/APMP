import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { ProjectService } from '../lib/services/ProjectService';
import { WBSConfigService } from '../lib/services/WBSConfigService';
import { findWBSConfigByProjectId, saveWBSConfig } from '../lib/models/WBSConfig';
import { GET, PUT } from '../app/api/projects/[id]/wbs/config/route';
import { buildWBSBreakdownPrompt } from '../lib/ai/prompts';
import { AIService } from '../lib/ai';

// 1. Mock the DB connector
vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// 2. In-memory data store for config documents
let inMemoryConfigs: Record<string, any> = {};

// 3. Mock the WBSConfig repository functions
vi.mock('../lib/models/WBSConfig', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/models/WBSConfig')>();
  return {
    ...original,
    findWBSConfigByProjectId: vi.fn(async (projectId: string) => {
      if (!mongoose.Types.ObjectId.isValid(projectId)) return undefined;
      return inMemoryConfigs[projectId];
    }),
    saveWBSConfig: vi.fn(async (projectId: string, input: any) => {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid project ID format');
      }
      const existing = inMemoryConfigs[projectId] || {};
      const updated = {
        id: existing.id || new mongoose.Types.ObjectId().toString(),
        projectId,
        techStack: {
          languages: input.techStack?.languages ?? [],
          frameworks: input.techStack?.frameworks ?? [],
          databases: input.techStack?.databases ?? [],
          cloud: input.techStack?.cloud ?? [],
        },
        teamComposition: input.teamComposition ?? '',
        compliance: input.compliance ?? [],
        integrations: input.integrations ?? [],
        timeline: input.timeline ?? {},
        createdAt: existing.createdAt || new Date(),
        updatedAt: new Date(),
      };
      inMemoryConfigs[projectId] = updated;
      return updated;
    }),
  };
});

// 4. Mock the ProjectService
vi.mock('../lib/services/ProjectService', () => {
  return {
    ProjectService: {
      getProjectById: vi.fn(async (projectId: string) => {
        if (!mongoose.Types.ObjectId.isValid(projectId) || projectId.startsWith('fake') || projectId === 'non-existent') {
          return undefined;
        }
        return {
          id: projectId,
          title: 'Mocked Test Project',
          userId: 'mock-user-123',
          status: 'active',
          createdAt: new Date(),
        };
      }),
    },
  };
});

describe('WBS Configuration Unit & Integration Tests (Mocked DB)', () => {
  const projectId = new mongoose.Types.ObjectId().toString();
  const routeUrl = `http://localhost:3000/api/projects/${projectId}/wbs/config`;

  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryConfigs = {};
  });

  /* ==========================================
   * 1. REPOSITORY LAYER MOCK TESTS
   * ========================================== */
  describe('Mocked Model Repository Functions', () => {
    it('should save and find configuration properties accurately', async () => {
      const configData = {
        techStack: {
          languages: ['TypeScript', 'Python'],
          frameworks: ['Next.js', 'FastAPI'],
          databases: ['MongoDB'],
          cloud: ['AWS'],
        },
        teamComposition: '5 developers',
        compliance: ['GDPR'],
        integrations: ['Stripe'],
        timeline: {
          expectedDurationMonths: 6,
          sprintLengthWeeks: 2,
        },
      };

      const saved = await saveWBSConfig(projectId, configData);
      expect(saved.id).toBeDefined();
      expect(saved.projectId).toBe(projectId);
      expect(saved.techStack.languages).toContain('TypeScript');
      expect(saved.timeline?.sprintLengthWeeks).toBe(2);

      const found = await findWBSConfigByProjectId(projectId);
      expect(found).toBeDefined();
      expect(found!.id).toBe(saved.id);
      expect(found!.teamComposition).toBe('5 developers');
    });

    it('should return undefined when retrieving non-existent or invalid project config', async () => {
      const missingConfig = await findWBSConfigByProjectId(new mongoose.Types.ObjectId().toString());
      expect(missingConfig).toBeUndefined();

      const invalidIdConfig = await findWBSConfigByProjectId('invalid-object-id-123');
      expect(invalidIdConfig).toBeUndefined();
    });

    it('should overwrite old config on successive upserts (atomic upsert behavior)', async () => {
      const data1 = {
        techStack: { languages: ['Java'], frameworks: [], databases: [], cloud: [] },
        teamComposition: 'Initial team',
        compliance: [],
        integrations: [],
        timeline: {},
      };

      const data2 = {
        techStack: { languages: ['Kotlin'], frameworks: [], databases: [], cloud: [] },
        teamComposition: 'Updated team',
        compliance: [],
        integrations: [],
        timeline: {},
      };

      const firstResult = await saveWBSConfig(projectId, data1);
      const secondResult = await saveWBSConfig(projectId, data2);

      // Verify that the ID remains the same, proving an in-place atomic upsert was executed
      expect(firstResult.id).toBe(secondResult.id);

      const found = await findWBSConfigByProjectId(projectId);
      expect(found?.teamComposition).toBe('Updated team');
      expect(found?.techStack.languages).toContain('Kotlin');
      expect(found?.techStack.languages).not.toContain('Java');
    });
  });

  /* ==========================================
   * 2. CONTROLLER SERVICE VALIDATION & XSS TESTS
   * ========================================== */
  describe('WBSConfigService Layer', () => {
    it('should pass validation and successfully persist valid inputs', async () => {
      const payload = {
        techStack: {
          languages: ['Rust'],
          frameworks: ['Actix'],
          databases: ['PostgreSQL'],
          cloud: ['Docker'],
        },
        teamComposition: '3 Engineers',
        compliance: ['HIPAA'],
        integrations: ['SendGrid'],
        timeline: {
          expectedDurationMonths: 3,
          sprintLengthWeeks: 1,
        },
      };

      const result = await WBSConfigService.saveWBSConfig(projectId, payload);
      expect(result.id).toBeDefined();
      expect(result.techStack.languages).toContain('Rust');
      expect(result.timeline?.expectedDurationMonths).toBe(3);
    });

    it('should throw an error for malformed payloads via strict Zod checking', async () => {
      const malformedPayload = {
        techStack: {
          languages: 'Should be an array but it is a string',
          frameworks: [],
          databases: [],
          cloud: [],
        },
        teamComposition: '',
        compliance: [],
        integrations: [],
      };

      await expect(
        WBSConfigService.saveWBSConfig(projectId, malformedPayload as any)
      ).rejects.toThrow(/Invalid WBS Configuration payload/);
    });

    it('should enforce a strict 1000 character limit on teamComposition text', async () => {
      const tooLongString = 'A'.repeat(1001);
      const invalidPayload = {
        techStack: { languages: [], frameworks: [], databases: [], cloud: [] },
        teamComposition: tooLongString,
        compliance: [],
        integrations: [],
        timeline: {},
      };

      await expect(
        WBSConfigService.saveWBSConfig(projectId, invalidPayload)
      ).rejects.toThrow(/Team composition description must be under 1000 characters/);

      const exactlyLimitString = 'A'.repeat(1000);
      const validPayload = {
        techStack: { languages: [], frameworks: [], databases: [], cloud: [] },
        teamComposition: exactlyLimitString,
        compliance: [],
        integrations: [],
        timeline: {},
      };

      const result = await WBSConfigService.saveWBSConfig(projectId, validPayload);
      expect(result.teamComposition).toBe(exactlyLimitString);
    });

    it('should perform strict HTML-escaping on teamComposition to prevent XSS script injection', async () => {
      const injectionAttempt = '<script>alert("XSS")</script> & "quotes" / \'test\'';
      const expectedEscaped = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt; &amp; &quot;quotes&quot; &#x2F; &#x27;test&#x27;';

      const payload = {
        techStack: { languages: [], frameworks: [], databases: [], cloud: [] },
        teamComposition: injectionAttempt,
        compliance: [],
        integrations: [],
        timeline: {},
      };

      const saved = await WBSConfigService.saveWBSConfig(projectId, payload);
      expect(saved.teamComposition).toBe(expectedEscaped);

      // Verify stored mock value
      const stored = await findWBSConfigByProjectId(projectId);
      expect(stored?.teamComposition).toBe(expectedEscaped);
    });

    it('W8: should support upsert behavior and update existing configuration in-place', async () => {
      const config1 = {
        techStack: { languages: ['Python'], frameworks: ['Django'], databases: [], cloud: [] },
        teamComposition: 'Initial Team',
        compliance: [],
        integrations: [],
        timeline: {},
      };

      const config2 = {
        techStack: { languages: ['Python', 'Ruby'], frameworks: ['Django', 'Rails'], databases: [], cloud: [] },
        teamComposition: 'Expanded Team',
        compliance: ['HIPAA'],
        integrations: [],
        timeline: {},
      };

      const result1 = await WBSConfigService.saveWBSConfig(projectId, config1);
      const result2 = await WBSConfigService.saveWBSConfig(projectId, config2);

      // IDs should be the same indicating an update, not a new document creation
      expect(result1.id).toBe(result2.id);

      const retrieved = await findWBSConfigByProjectId(projectId);
      expect(retrieved?.teamComposition).toBe('Expanded Team');
      expect(retrieved?.techStack.languages).toContain('Ruby');
      expect(retrieved?.compliance).toContain('HIPAA');
    });
  });

  /* ==========================================
   * 3. NEXT.JS 15 REST API ROUTE TESTS
   * ========================================== */
  describe('REST API Routes', () => {
    it('GET should return 404 when project does not exist', async () => {
      const fakeId = 'non-existent';
      const req = new NextRequest(`http://localhost:3000/api/projects/${fakeId}/wbs/config`);

      const res = await GET(req, { params: Promise.resolve({ id: fakeId }) });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Project not found');
    });

    it('GET should yield dynamic in-memory defaults when no custom configuration is saved yet', async () => {
      // Confirm memory has no config
      const dbConfig = await findWBSConfigByProjectId(projectId);
      expect(dbConfig).toBeUndefined();

      const req = new NextRequest(routeUrl);
      const res = await GET(req, { params: Promise.resolve({ id: projectId }) });
      
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.id).toBe('default');
      expect(body.projectId).toBe(projectId);
      expect(body.techStack.languages).toEqual([]);
      expect(body.teamComposition).toBe('');
      expect(body.createdAt).toBe(new Date(0).toISOString());

      // Assert that a GET query did NOT persist anything to database
      const dbConfigAfterGet = await findWBSConfigByProjectId(projectId);
      expect(dbConfigAfterGet).toBeUndefined();
    });

    it('GET should retrieve actual database configuration once updated', async () => {
      const data = {
        techStack: { languages: ['Go'], frameworks: ['Gin'], databases: [], cloud: [] },
        teamComposition: '2 Go Devs',
        compliance: [],
        integrations: [],
        timeline: {},
      };
      
      await WBSConfigService.saveWBSConfig(projectId, data);

      const req = new NextRequest(routeUrl);
      const res = await GET(req, { params: Promise.resolve({ id: projectId }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.id).not.toBe('default');
      expect(body.projectId).toBe(projectId);
      expect(body.techStack.languages).toContain('Go');
      expect(body.teamComposition).toBe('2 Go Devs');
    });

    it('PUT should validate, save configuration, and return status 200', async () => {
      const requestPayload = {
        techStack: {
          languages: ['C#'],
          frameworks: ['.NET Core'],
          databases: ['SQL Server'],
          cloud: ['Azure'],
        },
        teamComposition: '1 Architect & 1 Developer',
        compliance: ['SOC2'],
        integrations: [],
        timeline: {
          expectedDurationMonths: 4,
          sprintLengthWeeks: 3,
        },
      };

      const req = new NextRequest(routeUrl, {
        method: 'PUT',
        body: JSON.stringify(requestPayload),
      });

      const res = await PUT(req, { params: Promise.resolve({ id: projectId }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.projectId).toBe(projectId);
      expect(body.techStack.languages).toContain('C#');
      expect(body.teamComposition).toBe('1 Architect &amp; 1 Developer'); // escaped
      expect(body.timeline?.sprintLengthWeeks).toBe(3);

      // Verify in-memory state
      const dbSaved = await findWBSConfigByProjectId(projectId);
      expect(dbSaved).toBeDefined();
      expect(dbSaved!.techStack.frameworks).toContain('.NET Core');
    });

    it('PUT should reject invalid payloads and return status 400', async () => {
      const invalidPayload = {
        techStack: {
          languages: 'not-an-array',
        },
      };

      const req = new NextRequest(routeUrl, {
        method: 'PUT',
        body: JSON.stringify(invalidPayload),
      });

      const res = await PUT(req, { params: Promise.resolve({ id: projectId }) });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('Invalid WBS Configuration payload');
    });

    it('PUT should return 404 when project does not exist', async () => {
      const fakeId = 'non-existent';
      const req = new NextRequest(`http://localhost:3000/api/projects/${fakeId}/wbs/config`, {
        method: 'PUT',
        body: JSON.stringify({
          techStack: { languages: [], frameworks: [], databases: [], cloud: [] },
          teamComposition: 'Test text',
          compliance: [],
          integrations: [],
          timeline: {},
        }),
      });

      const res = await PUT(req, { params: Promise.resolve({ id: fakeId }) });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Project not found');
    });
  });

  /* ==========================================
   * 4. AI PROMPT BREAK DOWN GENERATION TESTS
   * ========================================== */
  describe('AI WBS Prompt Builder & AIService Integration', () => {


    it('should generate a robust prompt containing all custom context settings', () => {
      const sourceOfTruth = '# Requirement Specification\nREQ-1: The system must support credit card payment.';
      const config = {
        techStack: {
          languages: ['TypeScript', 'Go'],
          frameworks: ['Next.js', 'Gin'],
          databases: ['MongoDB'],
          cloud: ['AWS', 'Docker'],
        },
        teamComposition: '2 Backend Developers, 2 Frontend Developers, 1 QA',
        compliance: ['GDPR', 'OWASP Top 10'],
        integrations: ['Stripe', 'SendGrid'],
        timeline: {
          expectedDurationMonths: 3,
          sprintLengthWeeks: 2,
        },
      };

      const prompt = buildWBSBreakdownPrompt(sourceOfTruth, config);

      // Verify prompt includes technology stack elements
      expect(prompt).toContain('TypeScript, Go');
      expect(prompt).toContain('Next.js, Gin');
      expect(prompt).toContain('MongoDB');
      expect(prompt).toContain('AWS, Docker');

      // Verify prompt includes team makeup constraints
      expect(prompt).toContain('2 Backend Developers, 2 Frontend Developers, 1 QA');

      // Verify prompt includes compliance guidelines and integrations
      expect(prompt).toContain('GDPR, OWASP Top 10');
      expect(prompt).toContain('Stripe, SendGrid');

      // Verify prompt includes duration and sprint cycles
      expect(prompt).toContain('3 months');
      expect(prompt).toContain('2-week sprints');

      // Verify hierarchy active level rules are spelled out
      expect(prompt).toContain('Level 1: Epic');
      expect(prompt).toContain('Level 2: User Story');
      expect(prompt).toContain('Level 3: Task');
      expect(prompt).toContain('Level 4: Subtask');

      // Verify source requirements and requirements text are included
      expect(prompt).toContain('# Requirement Specification');
      expect(prompt).toContain('REQ-1: The system must support credit card payment.');
    });

    it('should fall back gracefully to "Not specified" in prompts for missing configuration details', () => {
      const sourceOfTruth = '# Requirements';
      const emptyConfig = {
        techStack: { languages: [], frameworks: [], databases: [], cloud: [] },
        teamComposition: '',
        compliance: [],
        integrations: [],
        timeline: {},
      };

      const prompt = buildWBSBreakdownPrompt(sourceOfTruth, emptyConfig);

      expect(prompt).toContain('**Languages**: Not specified');
      expect(prompt).toContain('**Frameworks**: Not specified');
      expect(prompt).toContain('**Databases**: Not specified');
      expect(prompt).toContain('**Cloud & Infrastructure**: Not specified');
      expect(prompt).toContain('**Team Makeup**: Not specified');
      expect(prompt).toContain('**Standards**: Not specified');
      expect(prompt).toContain('**Integrations**: Not specified');
      expect(prompt).toContain('**Timeline Duration**: Not specified');
      expect(prompt).toContain('**Sprint Cycles**: Not specified');
    });

    it('should route AIService.generateWBS requests to the active provider implementation', async () => {
      const mockResult = [
        { tempId: 'epic-1', parentTempId: null, title: 'Epic 1', type: 'epic', acceptanceCriteria: [], sourceRequirements: [] }
      ];
      
      const mockProvider = {
        convertDiagramToMermaid: vi.fn(),
        convertDiagramToMermaidStream: vi.fn(),
        convertBatchDiagramsToMermaid: vi.fn(),
        analyzeConflicts: vi.fn(),
        reformatToMarkdown: vi.fn(),
        generateWBS: vi.fn().mockResolvedValue(mockResult),
      };

      const aiService = AIService.getInstance();
      aiService.setProvider(mockProvider);

      const sourceOfTruth = '# Requirements';
      const config = {
        techStack: { languages: [], frameworks: [], databases: [], cloud: [] },
        teamComposition: '1 Dev',
        compliance: [],
        integrations: [],
        timeline: {},
      };

      const result = await aiService.generateWBS(sourceOfTruth, config);

      expect(mockProvider.generateWBS).toHaveBeenCalledWith(sourceOfTruth, config);
      expect(result).toEqual(mockResult);
    });
  });
});

