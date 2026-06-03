import WBSItemModel from '../models/WBSItem';
import { StoryPoint, ExternalSync } from '../models/Estimation';
import dbConnect from '../db';
import { GitHubIssueResponse } from './types';

export class ExportService {
  /**
   * Formats a WBSItem and optional StoryPoint estimation into a  GitHub Issue Markdown body.
   */
  static formatWBSItemToMarkdown(wbsItem: any, storyPoint?: any, subtasks: any[] = []): string {
    const lines: string[] = [];

    // Description Section
    lines.push(`## Description`);
    lines.push(wbsItem.description || '*No description provided.*');
    lines.push('');

    // Metadata Section (Using a neat Markdown list)
    lines.push(`## Task Metadata`);
    lines.push(`- **Type**: \`${wbsItem.type || 'N/A'}\``);
    lines.push(`- **Status**: \`${wbsItem.status || 'N/A'}\``);
    if (wbsItem.methodology) {
      lines.push(`- **Methodology**: \`${wbsItem.methodology}\``);
    }
    
    if (storyPoint) {
      const points = storyPoint.finalPoints !== undefined ? storyPoint.finalPoints : storyPoint.aiSuggestedPoints;
      if (points !== undefined) {
        lines.push(`- **Story Points**: \`${points}\``);
      }
      if (storyPoint.rationale) {
        lines.push(`- **Estimation Rationale**: ${storyPoint.rationale}`);
      }
    }
    lines.push('');

    // Acceptance Criteria Section
    if (wbsItem.acceptanceCriteria && wbsItem.acceptanceCriteria.length > 0) {
      lines.push(`## Acceptance Criteria`);
      wbsItem.acceptanceCriteria.forEach((criteria: string) => {
        lines.push(`- [ ] ${criteria}`);
      });
      lines.push('');
    }

    // Developer Tasks Checklist Section (Level 4 Subtasks)
    if (subtasks && subtasks.length > 0) {
      lines.push(`## Developer Tasks Checklist`);
      subtasks.forEach((sub: any) => {
        const descText = sub.description ? ` - ${sub.description}` : '';
        lines.push(`- [ ] **${sub.title}**${descText}`);
      });
      lines.push('');
    }

    // Source Requirements Section
    if (wbsItem.sourceRequirements && wbsItem.sourceRequirements.length > 0) {
      lines.push(`## Source Requirements`);
      wbsItem.sourceRequirements.forEach((req: string) => {
        lines.push(`- ${req}`);
      });
      lines.push('');
    }

    // Footer signature
    lines.push(`---`);
    lines.push(`*Synced automatically from Advanced Project Management Platform (APMP).*`);

    return lines.join('\n');
  }

  /**
   * Exports a WBSItem to a GitHub Issue, updating the ExternalSync status.
   */
  static async exportWBSItemToGitHub(
    wbsItemId: string,
    owner: string,
    repo: string,
    accessToken: string
  ): Promise<any> {
    await dbConnect();

    // 1. Fetch WBSItem
    const wbsItem = await WBSItemModel.findById(wbsItemId);
    if (!wbsItem) {
      throw new Error(`WBSItem with ID ${wbsItemId} not found.`);
    }

    // 2. Fetch optional StoryPoint estimation
    const storyPoint = await StoryPoint.findOne({ wbsItemId });

    // 2.5 Fetch any Level 4 Subtasks belonging to this WBS item
    const subtasks = await WBSItemModel.find({ parentId: wbsItem._id, type: 'subtask' }).sort({ order: 1 }).lean();

    // 3. Format Title and Body
    const typeLabel = wbsItem.type ? `[${wbsItem.type.toUpperCase()}] ` : '';
    const title = `${typeLabel}${wbsItem.title}`;
    const body = this.formatWBSItemToMarkdown(wbsItem, storyPoint, subtasks);

    try {
      // 4. Post issue creation request to GitHub
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'APMP-App',
        },
        body: JSON.stringify({
          title,
          body,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`GitHub API returned ${response.status}: ${errorBody}`);
      }

      const issueData = (await response.json()) as GitHubIssueResponse;

      // 5. Update or Create ExternalSync document to 'synced'
      const syncDoc = await ExternalSync.findOneAndUpdate(
        { wbsItemId: wbsItem._id, platform: 'github' },
        {
          projectId: wbsItem.projectId,
          wbsItemId: wbsItem._id,
          platform: 'github',
          externalId: String(issueData.number),
          externalUrl: issueData.html_url,
          syncStatus: 'synced',
          errorMessage: undefined,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      return syncDoc;
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : 'Unknown sync error';
      
      // 6. On failure, update or create ExternalSync document with status 'failed'
      try {
        await ExternalSync.findOneAndUpdate(
          { wbsItemId: wbsItem._id, platform: 'github' },
          {
            projectId: wbsItem.projectId,
            wbsItemId: wbsItem._id,
            platform: 'github',
            externalId: 'failed',
            syncStatus: 'failed',
            errorMessage: errMsg,
            lastSyncedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      } catch (dbError) {
        console.error('Failed to log sync failure in database:', dbError);
      }

      throw error;
    }
  }
}
