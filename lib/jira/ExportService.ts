import WBSItemModel from '../models/WBSItem';
import { StoryPoint, ExternalSync } from '../models/Estimation';
import dbConnect from '../db';
import { ADFConverter } from './ADFConverter';
import { OAuthService } from './OAuthService';
import { JiraIssueResponse } from './types';

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
    cloudIdOrDomain: string,
    projectKey: string,
    issueTypeName: string,
    accessTokenOrApiToken: string,
    email?: string,
    domain?: string
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
    const jiraEmail = email || process.env.E2E_JIRA_EMAIL || process.env.JIRA_EMAIL;
    const jiraDomain = domain || (cloudIdOrDomain && cloudIdOrDomain.includes('.atlassian.net') ? cloudIdOrDomain : (process.env.E2E_JIRA_DOMAIN || process.env.JIRA_DOMAIN));
    const isBasicAuth = !!(jiraEmail && jiraDomain);

    let requestUrl = `https://api.atlassian.com/ex/jira/${cloudIdOrDomain}/rest/api/3/issue`;
    let authHeader = `Bearer ${accessTokenOrApiToken}`;

    if (isBasicAuth) {
      const sanitizedDomain = jiraDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      requestUrl = `https://${sanitizedDomain}/rest/api/3/issue`;
      const credentials = Buffer.from(`${jiraEmail}:${accessTokenOrApiToken}`).toString('base64');
      authHeader = `Basic ${credentials}`;
    }

    try {
      // 5. Post issue creation request to Atlassian Jira REST API v3
      const response = await fetch(requestUrl, {
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
        const errorBody = await response.text();
        throw new Error(`Jira API returned ${response.status}: ${errorBody}`);
      }

      const issueData = (await response.json()) as JiraIssueResponse;

      // 6. Dynamically resolve the site's browse domain matching this cloudId for external URL construction
      let siteUrl = `https://atlassian.net`; // generic fallback
      if (isBasicAuth && jiraDomain) {
        siteUrl = `https://${jiraDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
      } else {
        try {
          const sites = await OAuthService.getAccessibleResources(accessTokenOrApiToken);
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
