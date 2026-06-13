import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OAuthService } from '../lib/jira/OAuthService';
import { ADFConverter } from '../lib/jira/ADFConverter';
import { ExportService } from '../lib/jira/ExportService';
import WBSItemModel from '../lib/models/WBSItem';
import { StoryPoint, ExternalSync } from '../lib/models/Estimation';
import { getIntegration, saveIntegration } from '../lib/models/UserIntegration';
import { encrypt } from '../lib/utils/encryption';

// 1. Mock the db connection to resolve instantly
vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// 2. Mock Mongoose models
vi.mock('../lib/models/WBSItem', () => {
  return {
    default: {
      findById: vi.fn(),
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

vi.mock('../lib/models/UserIntegration', () => {
  return {
    getIntegration: vi.fn(),
    saveIntegration: vi.fn(),
  };
});

describe('Jira Integration Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OAuthService Parameter Mapping & URL Construction', () => {
    it('should generate a random 32-character hex state string', () => {
      const state = OAuthService.generateState();
      expect(state).toHaveLength(32);
      expect(state).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should construct a correct Atlassian OAuth 3LO authorization redirect URL', () => {
      const state = 'test-jira-state';
      const urlString = OAuthService.getAuthorizeUrl(state);
      
      const url = new URL(urlString);
      expect(url.origin).toBe('https://auth.atlassian.com');
      expect(url.pathname).toBe('/authorize');
      expect(url.searchParams.get('audience')).toBe('api.atlassian.com');
      expect(url.searchParams.get('client_id')).toBe('test-jira-client-id');
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/jira/callback');
      expect(url.searchParams.get('state')).toBe(state);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe('read:jira-work write:jira-work offline_access');
    });
  });

  describe('ADFConverter (Atlassian Document Format) Serializer', () => {
    it('should convert a WBSItem with criteria into standard ADF json', () => {
      const wbsItem = {
        title: 'Establish Jira sync APIs',
        description: 'Deploy integration controllers to export tasks.',
        type: 'task',
        status: 'approved',
        methodology: 'scrum',
        acceptanceCriteria: ['OAuth validates', 'ADF exports'],
        sourceRequirements: ['REQ-JIRA'],
      };

      const doc = ADFConverter.convertToADF(wbsItem);

      expect(doc.type).toBe('doc');
      expect(doc.version).toBe(1);
      expect(doc.content).toBeDefined();

      // Heading checks
      const h2s = doc.content.filter(n => n.type === 'heading');
      expect(h2s.length).toBeGreaterThanOrEqual(1);
      expect(h2s[0].content?.[0].text).toBe('Description');

      // Paragraph check
      const paragraphs = doc.content.filter(n => n.type === 'paragraph');
      expect(paragraphs.length).toBeGreaterThanOrEqual(1);
      
      // Metadata Bullet List check
      const bulletLists = doc.content.filter(n => n.type === 'bulletList');
      expect(bulletLists.length).toBeGreaterThanOrEqual(1);

      // Signature Rule check
      const rules = doc.content.filter(n => n.type === 'rule');
      expect(rules).toHaveLength(1);
    });

    it('should inject StoryPoint estimation attributes into the metadata list', () => {
      const wbsItem = {
        title: 'Jira Task',
        description: 'Description content.',
        type: 'story',
        status: 'reviewed',
      };
      const storyPoint = {
        finalPoints: 8,
        rationale: 'High complexity API integration.',
      };

      const doc = ADFConverter.convertToADF(wbsItem, storyPoint);
      const bulletLists = doc.content.filter(n => n.type === 'bulletList');
      
      // The first bulletList should be metadata
      const metadataList = bulletLists[0];
      const metadataText = JSON.stringify(metadataList);
      
      expect(metadataText).toContain('Story Points');
      expect(metadataText).toContain('8');
      expect(metadataText).toContain('Estimation Rationale');
      expect(metadataText).toContain('High complexity API integration.');
    });
  });

  describe('ExportService API & DB Sync Mapping', () => {
    it('should map WBSItem types to standard Jira Cloud issue type names', () => {
      expect(ExportService.mapToJiraIssueType('epic')).toBe('Epic');
      expect(ExportService.mapToJiraIssueType('feature')).toBe('Story');
      expect(ExportService.mapToJiraIssueType('story')).toBe('Story');
      expect(ExportService.mapToJiraIssueType('task')).toBe('Task');
      expect(ExportService.mapToJiraIssueType('subtask')).toBe('Subtask');
      expect(ExportService.mapToJiraIssueType('GHOST')).toBe('Task'); // fallback
    });

    it('should create synced ExternalSync documents upon a mock successful Jira API call', async () => {
      const mockWbsItemId = '653df39df30dfa209fd134c3';
      const mockProjectId = '653df39df30dfa209fd134c0';
      const mockUserId = '645a1b2c3d4e5f6a7b8c9d0e';
      const mockWbsItem = {
        _id: mockWbsItemId,
        projectId: mockProjectId,
        title: 'Mock Export Jira Issue',
        description: 'Synchronizes task details.',
        type: 'task',
        status: 'approved',
      };

      vi.spyOn(WBSItemModel, 'findById').mockResolvedValue(mockWbsItem as any);
      vi.spyOn(StoryPoint, 'findOne').mockResolvedValue(null);

      const mockSyncDoc = {
        wbsItemId: mockWbsItemId,
        platform: 'jira',
        syncStatus: 'synced',
        externalId: 'PROJ-101',
        externalUrl: 'https://acme.atlassian.net/browse/PROJ-101',
      };
      vi.spyOn(ExternalSync, 'findOneAndUpdate').mockResolvedValue(mockSyncDoc as any);

      // Mock user integration
      const encryptedAccessToken = encrypt('mock-atlassian-token');
      vi.mocked(getIntegration).mockResolvedValue({
        userId: mockUserId,
        platform: 'jira',
        encryptedAccessToken,
        cloudId: 'mock-cloud-id',
        authType: 'oauth',
      } as any);

      // Spy on fetch:
      // First call: Issue creation POST
      // Second call: Accessible resources GET to resolve the URL domain
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('/accessible-resources')) {
          return {
            ok: true,
            status: 200,
            json: async () => [
              {
                id: 'mock-cloud-id',
                name: 'Acme Jira',
                url: 'https://acme.atlassian.net',
              }
            ],
          } as Response;
        }
        
        // Issue creation payload
        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: '10042',
            key: 'PROJ-101',
            self: 'https://api.atlassian.com/ex/jira/mock-cloud-id/rest/api/3/issue/10042',
          }),
        } as Response;
      });

      const syncDoc = await ExportService.exportWBSItemToJira(
        mockWbsItemId,
        'PROJ',
        'Task',
        mockUserId
      );

      expect(WBSItemModel.findById).toHaveBeenCalledWith(mockWbsItemId);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // Verify issue creation API details
      const creationCall = fetchSpy.mock.calls.find(c => String(c[0]).includes('/issue'));
      expect(creationCall).toBeDefined();
      const [issueUrl, issueOptions] = creationCall as [string, RequestInit];
      expect(issueUrl).toBe('https://api.atlassian.com/ex/jira/mock-cloud-id/rest/api/3/issue');
      expect(issueOptions.method).toBe('POST');
      const headers = issueOptions.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer mock-atlassian-token');

      // Verify DB updates
      expect(ExternalSync.findOneAndUpdate).toHaveBeenCalledWith(
        { wbsItemId: mockWbsItemId, platform: 'jira' },
        expect.objectContaining({
          projectId: mockProjectId,
          wbsItemId: mockWbsItemId,
          platform: 'jira',
          externalId: 'PROJ-101',
          externalUrl: 'https://acme.atlassian.net/browse/PROJ-101',
          syncStatus: 'synced',
        }),
        { upsert: true, new: true }
      );

      expect(syncDoc).toEqual(mockSyncDoc);

      fetchSpy.mockRestore();
    });

    it('should log a failed sync state in the DB if the Atlassian endpoint errors out', async () => {
      const mockWbsItemId = '653df39df30dfa209fd134c3';
      const mockProjectId = '653df39df30dfa209fd134c0';
      const mockUserId = '645a1b2c3d4e5f6a7b8c9d0e';
      const mockWbsItem = {
        _id: mockWbsItemId,
        projectId: mockProjectId,
        title: 'Mock Export Failure Jira',
        type: 'task',
        status: 'approved',
      };

      vi.spyOn(WBSItemModel, 'findById').mockResolvedValue(mockWbsItem as any);
      vi.spyOn(StoryPoint, 'findOne').mockResolvedValue(null);
      vi.spyOn(ExternalSync, 'findOneAndUpdate').mockResolvedValue({} as any);

      // Mock user integration
      const encryptedAccessToken = encrypt('mock-bad-token');
      vi.mocked(getIntegration).mockResolvedValue({
        userId: mockUserId,
        platform: 'jira',
        encryptedAccessToken,
        cloudId: 'mock-cloud-id',
        authType: 'oauth',
      } as any);

      // Mock fetch return rate limit error
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded.',
        } as Response;
      });

      await expect(
        ExportService.exportWBSItemToJira(
          mockWbsItemId,
          'PROJ',
          'Task',
          mockUserId
        )
      ).rejects.toThrow('Jira API returned 429');

      // Verify failed update logged in DB
      expect(ExternalSync.findOneAndUpdate).toHaveBeenCalledWith(
        { wbsItemId: mockWbsItemId, platform: 'jira' },
        expect.objectContaining({
          projectId: mockProjectId,
          wbsItemId: mockWbsItemId,
          platform: 'jira',
          externalId: 'failed',
          syncStatus: 'failed',
          errorMessage: 'Jira API returned 429: Rate limit exceeded.',
        }),
        { upsert: true, new: true }
      );

      fetchSpy.mockRestore();
    });

    it('should export successfully using Basic Authentication when email and domain are provided', async () => {
      const mockWbsItemId = '653df39df30dfa209fd134c3';
      const mockProjectId = '653df39df30dfa209fd134c0';
      const mockUserId = '645a1b2c3d4e5f6a7b8c9d0e';
      const mockWbsItem = {
        _id: mockWbsItemId,
        projectId: mockProjectId,
        title: 'Mock Basic Auth Export',
        type: 'task',
        status: 'approved',
      };

      vi.spyOn(WBSItemModel, 'findById').mockResolvedValue(mockWbsItem as any);
      vi.spyOn(StoryPoint, 'findOne').mockResolvedValue(null);

      const mockSyncDoc = {
        wbsItemId: mockWbsItemId,
        platform: 'jira',
        syncStatus: 'synced',
        externalId: 'PROJ-102',
        externalUrl: 'https://my-site.atlassian.net/browse/PROJ-102',
      };
      vi.spyOn(ExternalSync, 'findOneAndUpdate').mockResolvedValue(mockSyncDoc as any);

      // Mock getIntegration to return undefined so we fallback to basic credentials
      vi.mocked(getIntegration).mockResolvedValue(undefined);

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          id: '10043',
          key: 'PROJ-102',
        }),
      } as Response);

      const syncDoc = await ExportService.exportWBSItemToJira(
        mockWbsItemId,
        'PROJ',
        'Task',
        mockUserId,
        {
          apiToken: 'my-api-token',
          email: 'test@example.com',
          domain: 'my-site.atlassian.net'
        }
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      
      expect(url).toBe('https://my-site.atlassian.net/rest/api/3/issue');
      expect(options.method).toBe('POST');
      
      const headers = options.headers as Record<string, string>;
      const expectedCreds = Buffer.from('test@example.com:my-api-token').toString('base64');
      expect(headers['Authorization']).toBe(`Basic ${expectedCreds}`);

      expect(ExternalSync.findOneAndUpdate).toHaveBeenCalledWith(
        { wbsItemId: mockWbsItemId, platform: 'jira' },
        expect.objectContaining({
          projectId: mockProjectId,
          wbsItemId: mockWbsItemId,
          platform: 'jira',
          externalId: 'PROJ-102',
          externalUrl: 'https://my-site.atlassian.net/browse/PROJ-102',
          syncStatus: 'synced',
        }),
        { upsert: true, new: true }
      );

      expect(syncDoc).toEqual(mockSyncDoc);
      fetchSpy.mockRestore();
    });

    it('should automatically refresh Jira token and retry on 401 Unauthorized', async () => {
      const mockWbsItemId = '653df39df30dfa209fd134c3';
      const mockProjectId = '653df39df30dfa209fd134b0';
      const mockUserId = '645a1b2c3d4e5f6a7b8c9d0e';
      
      const mockWbsItem = {
        _id: mockWbsItemId,
        projectId: mockProjectId,
        title: 'Mock Export Jira Token Refresh',
        type: 'task',
        status: 'approved',
      };

      vi.spyOn(WBSItemModel, 'findById').mockResolvedValue(mockWbsItem as any);
      vi.spyOn(StoryPoint, 'findOne').mockResolvedValue(null);

      // Return a mock integration with a refresh token
      const oldEncryptedAccessToken = encrypt('expired-jira-token');
      const encryptedRefreshToken = encrypt('valid-jira-refresh-token');
      vi.mocked(getIntegration).mockResolvedValue({
        userId: mockUserId,
        platform: 'jira',
        encryptedAccessToken: oldEncryptedAccessToken,
        encryptedRefreshToken,
        cloudId: 'mock-cloud-id',
        authType: 'oauth',
      } as any);

      // Spy on saveIntegration to verify it saves the new tokens
      vi.mocked(saveIntegration).mockResolvedValue({} as any);

      // Mock OAuthService.refreshToken
      const refreshSpy = vi.spyOn(OAuthService, 'refreshToken').mockResolvedValue({
        access_token: 'new-refreshed-jira-token',
        refresh_token: 'new-refresh-jira-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read:jira-work',
      });

      // Mock fetch:
      // 1st call (issue creation): 401 Unauthorized
      // 2nd call (issue creation retry): 201 Created
      // 3rd call (accessible resources): 200 OK
      let callCount = 0;
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('/accessible-resources')) {
          return {
            ok: true,
            status: 200,
            json: async () => [
              {
                id: 'mock-cloud-id',
                name: 'Acme Jira',
                url: 'https://acme.atlassian.net',
              }
            ],
          } as Response;
        }

        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 401,
            text: async () => 'Unauthorized',
          } as Response;
        }

        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: '10042',
            key: 'PROJ-101',
          }),
        } as Response;
      });

      vi.spyOn(ExternalSync, 'findOneAndUpdate').mockResolvedValue({} as any);

      await ExportService.exportWBSItemToJira(
        mockWbsItemId,
        'PROJ',
        'Task',
        mockUserId
      );

      // Verify OAuthService.refreshToken was called
      expect(refreshSpy).toHaveBeenCalledWith('valid-jira-refresh-token');

      // Verify new integration was stored
      expect(saveIntegration).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockUserId,
        platform: 'jira',
        encryptedAccessToken: expect.any(String),
        encryptedRefreshToken: expect.any(String),
      }));

      // Verify fetch was called 3 times (1st issue call -> 401, refresh, 2nd issue retry call -> 201, 3rd accessible resources call -> 200)
      expect(fetchSpy).toHaveBeenCalledTimes(3);

      fetchSpy.mockRestore();
      refreshSpy.mockRestore();
    });
  });
});

