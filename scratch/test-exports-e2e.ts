import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import dbConnect from '../lib/db';
import WBSItemModel from '../lib/models/WBSItem';
import { ExternalSync } from '../lib/models/Estimation';
import { ExportService as GitHubExportService } from '../lib/github/ExportService';
import { ExportService as JiraExportService } from '../lib/jira/ExportService';

// 1. Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runE2EIntegrationTests() {
  console.log('========================================================================');
  console.log('                 STARTING LIVE END-TO-END INTEGRATION TESTS             ');
  console.log('========================================================================\n');

  // Load configured keys
  const ghToken = process.env.E2E_GITHUB_TOKEN;
  const ghOwner = process.env.E2E_GITHUB_OWNER;
  const ghRepo = process.env.E2E_GITHUB_REPO;

  const jiraToken = process.env.E2E_JIRA_TOKEN;
  const jiraCloudId = process.env.E2E_JIRA_CLOUD_ID;
  const jiraProjectKey = process.env.E2E_JIRA_PROJECT_KEY;
  const jiraEmail = process.env.E2E_JIRA_EMAIL;
  const jiraDomain = process.env.E2E_JIRA_DOMAIN;

  // Validate presence of credentials
  if (!ghToken || !ghOwner || !ghRepo) {
    console.error('ERROR: Missing GitHub E2E credentials in .env.local. Please check: E2E_GITHUB_TOKEN, E2E_GITHUB_OWNER, E2E_GITHUB_REPO');
    process.exit(1);
  }

  const hasJiraBasicAuth = !!(jiraToken && jiraEmail && jiraDomain && jiraProjectKey);
  const hasJiraOAuth = !!(jiraToken && jiraCloudId && jiraProjectKey);

  if (!hasJiraBasicAuth && !hasJiraOAuth) {
    console.error('ERROR: Missing Jira E2E credentials in .env.local.');
    console.error('Please configure either:');
    console.error('  A. Basic Auth: E2E_JIRA_TOKEN (API Token), E2E_JIRA_EMAIL, E2E_JIRA_DOMAIN, E2E_JIRA_PROJECT_KEY');
    console.error('  B. OAuth 2.0: E2E_JIRA_TOKEN (OAuth Token), E2E_JIRA_CLOUD_ID, E2E_JIRA_PROJECT_KEY');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await dbConnect();

  // 2. Fetch the seeded Level 3 WBS Task
  console.log('Fetching seeded Level 3 WBS Task from database...');
  const task = await WBSItemModel.findOne({
    title: 'Develop secure Stripe checkout page',
    type: 'task'
  });

  if (!task) {
    console.error('ERROR: Mock WBS Task not found. Please run the seeding script first: npx tsx scratch/seed-e2e-data.ts');
    mongoose.connection.close();
    process.exit(1);
  }

  const taskId = task._id.toString();
  console.log(`Target Task found: "${task.title}" (ID: ${taskId})`);

  /* ========================================================================
   * PART 1: LIVE GITHUB ISSUE EXPORT
   * ======================================================================== */
  console.log('\n------------------------------------------------------------------------');
  console.log('                   PART 1: EXPORTING WBS TASK TO GITHUB                 ');
  console.log('------------------------------------------------------------------------');
  console.log(`Syncing task to GitHub repo: https://github.com/${ghOwner}/${ghRepo}...`);

  try {
    const ghSync = await GitHubExportService.exportWBSItemToGitHub(
      taskId,
      ghOwner,
      ghRepo,
      ghToken
    );

    console.log('\n✓ GITHUB SYNC SUCCESSFUL!');
    console.log(`GitHub Issue Number: ${ghSync.externalId}`);
    console.log(`GitHub Issue URL:    ${ghSync.externalUrl}`);

    // Verify DB Sync Document status matches
    const dbSync = await ExternalSync.findOne({ wbsItemId: task._id, platform: 'github' });
    console.log(`Database Sync Status: ${dbSync?.syncStatus} (Last Synced At: ${dbSync?.lastSyncedAt})`);
  } catch (error: any) {
    console.error('\n✗ GITHUB SYNC FAILED!');
    console.error(`Error details: ${error.message}`);
  }

  /* ========================================================================
   * PART 2: LIVE JIRA ISSUE EXPORT
   * ======================================================================== */
  console.log('\n------------------------------------------------------------------------');
  console.log('                    PART 2: EXPORTING WBS TASK TO JIRA                  ');
  console.log('------------------------------------------------------------------------');
  if (hasJiraBasicAuth) {
    console.log(`Syncing task to Jira Cloud (Basic Auth) Site: ${jiraDomain} | Project: ${jiraProjectKey}...`);
  } else {
    console.log(`Syncing task to Jira Cloud (OAuth 2.0) CloudID: ${jiraCloudId} | Project: ${jiraProjectKey}...`);
  }

  try {
    const jiraSync = await JiraExportService.exportWBSItemToJira(
      taskId,
      jiraCloudId || jiraDomain || '',
      jiraProjectKey!,
      'Task', // Map to standard Jira Issue type
      jiraToken!,
      jiraEmail,
      jiraDomain
    );

    console.log('\n✓ JIRA SYNC SUCCESSFUL!');
    console.log(`Jira Issue Key: ${jiraSync.externalId}`);
    console.log(`Jira Issue URL: ${jiraSync.externalUrl}`);

    // Verify DB Sync Document status matches
    const dbSync = await ExternalSync.findOne({ wbsItemId: task._id, platform: 'jira' });
    console.log(`Database Sync Status: ${dbSync?.syncStatus} (Last Synced At: ${dbSync?.lastSyncedAt})`);
  } catch (error: any) {
    console.error('\n✗ JIRA SYNC FAILED!');
    console.error(`Error details: ${error.message}`);

    // Help debug Project Key or Cloud ID mismatch by fetching available projects
    try {
      console.log('\n[DEBUG] Fetching available projects on your Jira Cloud...');
      const response = await fetch(`https://api.atlassian.com/ex/jira/${jiraCloudId}/rest/api/3/project`, {
        headers: {
          'Authorization': `Bearer ${jiraToken}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const projects = await response.json();
        if (Array.isArray(projects) && projects.length > 0) {
          console.log('Found the following active projects in your Jira:');
          projects.forEach((proj: any) => {
            console.log(` - Key: "${proj.key}" | Name: "${proj.name}"`);
          });
          console.log('\nPlease update E2E_JIRA_PROJECT_KEY in .env.local with one of these keys!');
        } else {
          console.log('No projects found in this Jira Cloud environment.');
        }
      } else {
        const errText = await response.text();
        console.log(`Failed to list projects. HTTP Status ${response.status}: ${errText}`);
      }

      console.log('\n[DEBUG] Querying accessible sites and Cloud IDs for your token...');
      const tokenRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: {
          'Authorization': `Bearer ${jiraToken}`,
          'Accept': 'application/json'
        }
      });
      if (tokenRes.ok) {
        const resources = await tokenRes.json();
        console.log('Accessible sites found for this token:');
        console.log(JSON.stringify(resources, null, 2));
        console.log('\nPlease verify if E2E_JIRA_CLOUD_ID matches the "id" value from the list above!');
      } else {
        const errText = await tokenRes.text();
        console.log(`Failed to fetch accessible resources. HTTP Status ${tokenRes.status}: ${errText}`);
      }
    } catch (debugErr: any) {
      console.log(`Could not query projects list: ${debugErr.message}`);
    }
  }

  console.log('\n========================================================================');
  console.log('                    E2E INTEGRATION SYNC COMPLETION                     ');
  console.log('========================================================================');
  
  mongoose.connection.close();
}

runE2EIntegrationTests().catch(err => {
  console.error('Integration runner exception:', err);
  process.exit(1);
});
