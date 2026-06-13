import WBSItemModel from '../models/WBSItem';
import { StoryPoint, ExternalSync } from '../models/Estimation';
import dbConnect from '../db';
import { ADFConverter } from './ADFConverter';
import { OAuthService } from './OAuthService';
import { JiraIssueResponse } from './types';
import { getIntegration, saveIntegration } from '../models/UserIntegration';
import { encrypt, decrypt } from '../utils/encryption';

export class ExportService {
  /**
   * Maps WBSItem task types to standard Jira Cloud Issue Type names.
   */
  static mapToJiraIssueType(wbsType: string): string {
    switch (wbsType?.toLowerCase()) {
      case 'epic':
        return 'Epic';
      case 'feature':
      case 'story':
        return 'Story';
      case 'subtask':
        return 'Subtask';
      case 'task':
      default:
        return 'Task';
    }
  }

  /**
   * Exports a WBSItem to a Jira Issue, updating the ExternalSync status.
   * Supports both OAuth 2.0 (standard 3LO) and Basic Authentication.
   */
  static async exportWBSItemToJira(
    wbsItemId: string,
    projectKey: string,
    issueTypeName: string,
    userId: string,
    fallbackBasicAuth?: {
      email?: string;
      domain?: string;
      apiToken?: string;
    }
  ): Promise<any> {
    await dbConnect();

    // 1. Fetch WBSItem
    const wbsItem = await WBSItemModel.findById(wbsItemId);
    if (!wbsItem) {
      throw new Error(`WBSItem with ID ${wbsItemId} not found.`);
    }

    // 2. Fetch optional StoryPoint estimation
    const storyPoint = await StoryPoint.findOne({ wbsItemId });

    // 3. Format Title and Convert description to Atlassian Document Format (ADF)
    const typeLabel = wbsItem.type ? `[${wbsItem.type.toUpperCase()}] ` : '';
    const summary = `${typeLabel}${wbsItem.title}`;
    const descriptionADF = ADFConverter.convertToADF(wbsItem, storyPoint);

    // 4. Resolve Jira Issue Type Name
    const finalIssueType = issueTypeName || this.mapToJiraIssueType(wbsItem.type);

    // Determine authentication scheme (Basic Auth vs OAuth 2.0 Bearer)
    const integration = await getIntegration(userId, 'jira');

    let cloudIdOrDomain: string | undefined;
    let accessTokenOrApiToken: string | undefined;
    let email: string | undefined;
    let domain: string | undefined;
    let isBasicAuth = false;
    let isOAuth = false;

    if (integration) {
      if (integration.authType === 'oauth') {
        cloudIdOrDomain = integration.cloudId;
        accessTokenOrApiToken = decrypt(integration.encryptedAccessToken);
        isOAuth = true;
        isBasicAuth = false;
      } else {
        cloudIdOrDomain = integration.domain;
        accessTokenOrApiToken = decrypt(integration.encryptedAccessToken);
        email = integration.email;
        domain = integration.domain;
        isBasicAuth = true;
      }
    } else if (fallbackBasicAuth && fallbackBasicAuth.apiToken && fallbackBasicAuth.email && fallbackBasicAuth.domain) {
      cloudIdOrDomain = fallbackBasicAuth.domain;
      accessTokenOrApiToken = fallbackBasicAuth.apiToken;
      email = fallbackBasicAuth.email;
      domain = fallbackBasicAuth.domain;
      isBasicAuth = true;
    }

    if (!accessTokenOrApiToken) {
      throw new Error('Jira integration not found or no authentication credentials provided.');
    }

    let requestUrl = '';
    let authHeader = '';

    if (isBasicAuth) {
      const sanitizedDomain = domain!.replace(/^https?:\/\//, '').replace(/\/$/, '');
      requestUrl = `https://${sanitizedDomain}/rest/api/3/issue`;
      const credentials = Buffer.from(`${email}:${accessTokenOrApiToken}`).toString('base64');
      authHeader = `Basic ${credentials}`;
    } else {
      requestUrl = `https://api.atlassian.com/ex/jira/${cloudIdOrDomain}/rest/api/3/issue`;
      authHeader = `Bearer ${accessTokenOrApiToken}`;
    }

    try {
      // 5. Post issue creation request to Atlassian Jira REST API v3
      let response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          fields: {
            project: {
              key: projectKey,
            },
            summary,
            description: descriptionADF,
            issuetype: {
              name: finalIssueType,
            },
          },
        }),
      });

      if (!response.ok) {
        // If 401 and refresh token is available, attempt to refresh the token
        if (response.status === 401 && isOAuth && integration && integration.encryptedRefreshToken) {
          try {
            console.log('Jira access token expired. Attempting token refresh...');
            const refreshToken = decrypt(integration.encryptedRefreshToken);
            const tokenData = await OAuthService.refreshToken(refreshToken);
            
            const newEncryptedAccessToken = encrypt(tokenData.access_token);
            const newEncryptedRefreshToken = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : undefined;
            const newExpiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined;

            await saveIntegration({
              userId,
              platform: 'jira',
              encryptedAccessToken: newEncryptedAccessToken,
              encryptedRefreshToken: newEncryptedRefreshToken || integration.encryptedRefreshToken,
              expiresAt: newExpiresAt,
              cloudId: integration.cloudId,
              authType: 'oauth',
            });

            accessTokenOrApiToken = tokenData.access_token;
            authHeader = `Bearer ${accessTokenOrApiToken}`;

            // Retry export
            response = await fetch(requestUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader,
              },
              body: JSON.stringify({
                fields: {
                  project: {
                    key: projectKey,
                  },
                  summary,
                  description: descriptionADF,
                  issuetype: {
                    name: finalIssueType,
                  },
                },
              }),
            });
          } catch (refreshErr: any) {
            console.error('Jira automatic token refresh/retry failed:', refreshErr);
            throw new Error(`Jira token expired and refresh failed: ${refreshErr.message}`);
          }
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Jira API returned ${response.status}: ${errorBody}`);
        }
      }

      const issueData = (await response.json()) as JiraIssueResponse;

      // 6. Dynamically resolve the site's browse domain matching this cloudId for external URL construction
      let siteUrl = `https://atlassian.net`; // generic fallback
      if (isBasicAuth && domain) {
        siteUrl = `https://${domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
      } else {
        try {
          const sites = await OAuthService.getAccessibleResources(accessTokenOrApiToken!);
          const currentSite = sites.find((s) => s.id === cloudIdOrDomain);
          if (currentSite && currentSite.url) {
            siteUrl = currentSite.url;
          }
        } catch (siteErr) {
          console.error('Failed to resolve Jira site domain for url generation:', siteErr);
        }
      }

      const externalUrl = `${siteUrl}/browse/${issueData.key}`;

      // 7. Update or Create ExternalSync document to 'synced'
      const syncDoc = await ExternalSync.findOneAndUpdate(
        { wbsItemId: wbsItem._id, platform: 'jira' },
        {
          projectId: wbsItem.projectId,
          wbsItemId: wbsItem._id,
          platform: 'jira',
          externalId: issueData.key,
          externalUrl: externalUrl,
          syncStatus: 'synced',
          errorMessage: undefined,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      return syncDoc;
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : 'Unknown Jira sync error';
      
      // 8. On failure, update or create ExternalSync document with status 'failed'
      try {
        await ExternalSync.findOneAndUpdate(
          { wbsItemId: wbsItem._id, platform: 'jira' },
          {
            projectId: wbsItem.projectId,
            wbsItemId: wbsItem._id,
            platform: 'jira',
            externalId: 'failed',
            syncStatus: 'failed',
            errorMessage: errMsg,
            lastSyncedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      } catch (dbError) {
        console.error('Failed to log Jira sync failure in database:', dbError);
      }

      throw error;
    }
  }
}

