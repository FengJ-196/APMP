import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OAuthService } from '../lib/github/OAuthService';
import { ExportService } from '../lib/github/ExportService';
import WBSItemModel from '../lib/models/WBSItem';
import { StoryPoint, ExternalSync } from '../lib/models/Estimation';

// 1. Mock the db connection to resolve instantly
vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// 2. Mock Mongoose models
vi.mock('../lib/models/WBSItem', () => {
  return {
    default: {
      findById: vi.fn(),
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          lean: vi.fn().mockResolvedValue([]),
        })),
        lean: vi.fn().mockResolvedValue([]),
      })),
    },
  };
});

vi.mock('../lib/models/Estimation', () => {
  return {
    StoryPoint: {
      findOne: vi.fn(),
    },
    ExternalSync: {
      findOneAndUpdate: vi.fn(),
    },
  };
});

describe('GitHub Integration Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OAuthService PKCE & URL Construction', () => {
    it('should generate a 43-character base64url PKCE verifier', () => {
      const verifier = OAuthService.generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
    });

    it('should generate a valid SHA-256 base64url challenge matching the verifier', () => {
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
      
      const challenge = OAuthService.generateCodeChallenge(verifier);
      expect(challenge).toBe(expectedChallenge);
    });

    it('should generate a random 32-character hex state string', () => {
      const state = OAuthService.generateState();
      expect(state).toHaveLength(32);
      expect(state).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should construct a correct GitHub OAuth authorization redirect URL', () => {
      const state = 'teststate';
      const challenge = 'testchallenge';
      const urlString = OAuthService.getAuthorizeUrl(state, challenge);
      
      const url = new URL(urlString);
      expect(url.origin).toBe('https://github.com');
      expect(url.pathname).toBe('/login/oauth/authorize');
      expect(url.searchParams.get('client_id')).toBe('test-client-id');
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/github/callback');
      expect(url.searchParams.get('state')).toBe(state);
      expect(url.searchParams.get('code_challenge')).toBe(challenge);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    });
  });

  describe('ExportService Markdown Formatting', () => {
    it('should format a WBSItem with acceptance criteria into clean markdown', () => {
      const wbsItem = {
        title: 'Implement database connections',
        description: 'Establish mongoose connections to the server.',
        type: 'task',
        status: 'approved',
        methodology: 'scrum',
        acceptanceCriteria: ['Connection established', 'Handles pool timeouts'],
        sourceRequirements: ['REQ-101'],
      };

      const markdown = ExportService.formatWBSItemToMarkdown(wbsItem);

      expect(markdown).toContain('## Description');
      expect(markdown).toContain('Establish mongoose connections to the server.');
      expect(markdown).toContain('**Type**: `task`');
      expect(markdown).toContain('**Status**: `approved`');
      expect(markdown).toContain('**Methodology**: `scrum`');
      expect(markdown).toContain('## Acceptance Criteria');
      expect(markdown).toContain('- [ ] Connection established');
      expect(markdown).toContain('- [ ] Handles pool timeouts');
      expect(markdown).toContain('## Source Requirements');
      expect(markdown).toContain('- REQ-101');
    });

    it('should include StoryPoint estimations in the formatted markdown if provided', () => {
      const wbsItem = {
        title: 'Task Title',
        description: 'Task description.',
        type: 'story',
        status: 'reviewed',
      };
      
      const storyPoint = {
        finalPoints: 5,
        rationale: 'Medium complexity database work.',
      };

      const markdown = ExportService.formatWBSItemToMarkdown(wbsItem, storyPoint);

      expect(markdown).toContain('**Story Points**: `5`');
      expect(markdown).toContain('- **Estimation Rationale**: Medium complexity database work.');
    });
  });

  describe('ExportService API and Database Integration', () => {
    it('should successfully create/update ExternalSync documents upon a mock successful export API call', async () => {
      // 1. Mock WBSItem lookup
      const mockWbsItemId = '653df39df30dfa209fd134b2';
      const mockProjectId = '653df39df30dfa209fd134b0';
      const mockWbsItem = {
        _id: mockWbsItemId,
        projectId: mockProjectId,
        title: 'Test GitHub Task Export',
        description: 'Verify sync record gets updated properly.',
        type: 'task',
        status: 'approved',
        acceptanceCriteria: ['Sync updates DB'],
      };
      vi.spyOn(WBSItemModel, 'findById').mockResolvedValue(mockWbsItem as any);

      // 2. Mock StoryPoint lookup
      const mockStoryPoint = {
        wbsItemId: mockWbsItemId,
        projectId: mockProjectId,
        finalPoints: 3,
        rationale: 'Straightforward mock test.',
      };
      vi.spyOn(StoryPoint, 'findOne').mockResolvedValue(mockStoryPoint as any);

      // 3. Mock ExternalSync database update
      const mockSyncDoc = {
        wbsItemId: mockWbsItemId,
        platform: 'github',
        syncStatus: 'synced',
        externalId: '42',
        externalUrl: 'https://github.com/test-owner/test-repo/issues/42',
      };
      vi.spyOn(ExternalSync, 'findOneAndUpdate').mockResolvedValue(mockSyncDoc as any);

      // 4. Spy on fetch to return a successful mock response
      const mockIssueNumber = 42;
      const mockIssueUrl = 'https://github.com/test-owner/test-repo/issues/42';
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: 1234567,
            number: mockIssueNumber,
            html_url: mockIssueUrl,
            title: '[TASK] Test GitHub Task Export',
            state: 'open',
          }),
        } as Response;
      });

      // 5. Perform mock export
      const syncDoc = await ExportService.exportWBSItemToGitHub(
        mockWbsItemId,
        'test-owner',
        'test-repo',
        'mock-access-token'
      );

      // 6. Verify WBSItem findById called with correct id
      expect(WBSItemModel.findById).toHaveBeenCalledWith(mockWbsItemId);
      expect(StoryPoint.findOne).toHaveBeenCalledWith({ wbsItemId: mockWbsItemId });

      // 7. Verify API was invoked correctly
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.github.com/repos/test-owner/test-repo/issues');
      expect(options.method).toBe('POST');
      const headers = options.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer mock-access-token');

      // 8. Verify the ExternalSync DB call parameters
      expect(ExternalSync.findOneAndUpdate).toHaveBeenCalledWith(
        { wbsItemId: mockWbsItemId, platform: 'github' },
        expect.objectContaining({
          projectId: mockProjectId,
          wbsItemId: mockWbsItemId,
          platform: 'github',
          externalId: '42',
          externalUrl: mockIssueUrl,
          syncStatus: 'synced',
        }),
        { upsert: true, new: true }
      );

      expect(syncDoc).toEqual(mockSyncDoc);

      fetchSpy.mockRestore();
    });

    it('should log sync failure in the DB if the API call throws an error', async () => {
      // 1. Mock WBSItem and StoryPoint lookups
      const mockWbsItemId = '653df39df30dfa209fd134b2';
      const mockProjectId = '653df39df30dfa209fd134b0';
      const mockWbsItem = {
        _id: mockWbsItemId,
        projectId: mockProjectId,
        title: 'Test GitHub Task Export Failure',
        description: 'Verify sync record handles error states.',
        type: 'task',
        status: 'approved',
      };
      vi.spyOn(WBSItemModel, 'findById').mockResolvedValue(mockWbsItem as any);
      vi.spyOn(StoryPoint, 'findOne').mockResolvedValue(null);

      // 2. Mock ExternalSync DB update for failure
      vi.spyOn(ExternalSync, 'findOneAndUpdate').mockResolvedValue({} as any);

      // 3. Mock fetch to return a failure status
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: false,
          status: 403,
          text: async () => 'Rate limit exceeded or invalid scope',
        } as Response;
      });

      // 4. Perform export expecting it to throw
      await expect(
        ExportService.exportWBSItemToGitHub(
          mockWbsItemId,
          'test-owner',
          'test-repo',
          'mock-invalid-token'
        )
      ).rejects.toThrow('GitHub API returned 403');

      // 5. Verify database logged a failed status
      expect(ExternalSync.findOneAndUpdate).toHaveBeenCalledWith(
        { wbsItemId: mockWbsItemId, platform: 'github' },
        expect.objectContaining({
          projectId: mockProjectId,
          wbsItemId: mockWbsItemId,
          platform: 'github',
          externalId: 'failed',
          syncStatus: 'failed',
          errorMessage: 'GitHub API returned 403: Rate limit exceeded or invalid scope',
        }),
        { upsert: true, new: true }
      );

      fetchSpy.mockRestore();
    });
  });
});
