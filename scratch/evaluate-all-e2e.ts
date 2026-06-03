import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

// 1. Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const BASE_URL = 'http://localhost:3000';

async function runE2E() {
  console.log('========================================================================');
  console.log('             STARTING COMPREHENSIVE E2E FUNCTIONALITY EVALUATION       ');
  console.log('========================================================================\n');

  let testEmail = `e2e-${Date.now()}@example.com`;
  let testPassword = 'SecurePassword123!';
  let accessToken = '';
  let refreshToken = '';
  let projectId = '';
  let fileId = '';
  let sotId = '';
  let taskId = '';

  // ------------------------------------------------------------------------
  // 1. AUTH FLOW: REGISTER -> LOGIN -> REFRESH
  // ------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('Phase 1: Authentication System (Register -> Login -> Refresh)');
  console.log('------------------------------------------------------------------------');

  // Register
  console.log(`[POST] /api/auth/register with ${testEmail}...`);
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  if (!regRes.ok) {
    console.error(`Register failed: ${regRes.status} ${await regRes.text()}`);
    process.exit(1);
  }
  const regData = await regRes.json();
  console.log('✓ Register successful!');
  expectField(regData.user, 'id');
  expectField(regData.tokens, 'accessToken');
  expectField(regData.tokens, 'refreshToken');

  // Login
  console.log(`[POST] /api/auth/login with ${testEmail}...`);
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  if (!loginRes.ok) {
    console.error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
    process.exit(1);
  }
  const loginData = await loginRes.json();
  console.log('✓ Login successful!');
  accessToken = loginData.tokens.accessToken;
  refreshToken = loginData.tokens.refreshToken;

  // Refresh
  console.log(`[POST] /api/auth/refresh...`);
  const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!refreshRes.ok) {
    console.error(`Refresh failed: ${refreshRes.status} ${await refreshRes.text()}`);
    process.exit(1);
  }
  const refreshData = await refreshRes.json();
  console.log('✓ Token Refresh successful!');
  accessToken = refreshData.accessToken;
  expectField(refreshData, 'accessToken');
  expectField(refreshData, 'refreshToken');

  // ------------------------------------------------------------------------
  // 2. PROJECT FLOW: CREATE -> GET -> LIST
  // ------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('Phase 2: Project Management (Create -> Get -> List)');
  console.log('------------------------------------------------------------------------');

  // Create Project
  console.log(`[POST] /api/projects...`);
  const createProjRes = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'E2E Testing Project', userId: regData.user.id }),
  });
  if (!createProjRes.ok) {
    console.error(`Create project failed: ${createProjRes.status} ${await createProjRes.text()}`);
    process.exit(1);
  }
  const projData = await createProjRes.json();
  projectId = projData.id;
  console.log(`✓ Project created with ID: ${projectId}`);
  expectField(projData, 'id');
  expectValue(projData.title, 'E2E Testing Project');

  // List Projects
  console.log(`[GET] /api/projects/all?userId=${regData.user.id}...`);
  const listProjsRes = await fetch(`${BASE_URL}/api/projects/all?userId=${regData.user.id}`);
  if (!listProjsRes.ok) {
    console.error(`List projects failed: ${listProjsRes.status} ${await listProjsRes.text()}`);
    process.exit(1);
  }
  const projsList = await listProjsRes.json();
  console.log(`✓ Fetched ${projsList.length} projects!`);
  expectArrayLength(projsList, 1);

  // Get Project By ID
  console.log(`[GET] /api/projects/${projectId}...`);
  const getProjRes = await fetch(`${BASE_URL}/api/projects/${projectId}`);
  if (!getProjRes.ok) {
    console.error(`Get project failed: ${getProjRes.status} ${await getProjRes.text()}`);
    process.exit(1);
  }
  const getProjData = await getProjRes.json();
  console.log('✓ Project retrieve matches created project!');
  expectValue(getProjData.id, projectId);

  // ------------------------------------------------------------------------
  // 3. FILE FLOW: UPLOAD -> GET METADATA -> DELETE
  // ------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('Phase 3: File Upload & Binary Storage (Upload -> Get -> Delete)');
  console.log('------------------------------------------------------------------------');

  // Upload File
  console.log(`[POST] /api/files/upload...`);
  const formData = new FormData();
  const fileBlob = new Blob(['# Sample PDF binary content'], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'e2e_document.pdf');
  formData.append('projectId', projectId);
  formData.append('userId', regData.user.id);

  const uploadRes = await fetch(`${BASE_URL}/api/files/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!uploadRes.ok) {
    console.error(`File upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
    process.exit(1);
  }
  const fileData = await uploadRes.json();
  fileId = fileData.id;
  console.log(`✓ File uploaded successfully! ID: ${fileId}`);
  expectField(fileData, 'id');
  expectValue(fileData.originalName, 'e2e_document.pdf');
  expectValue(fileData.contentType, 'application/pdf');

  // Get File By ID
  console.log(`[GET] /api/projects/${projectId}...`);
  const getProjWithFilesRes = await fetch(`${BASE_URL}/api/projects/${projectId}`);
  const getProjWithFilesData = await getProjWithFilesRes.json();
  console.log(`✓ Verified project files list has ${getProjWithFilesData.files?.length} files.`);
  expectValue(getProjWithFilesData.files?.[0]?.originalName, 'e2e_document.pdf');

  // Delete File
  console.log(`[DELETE] /api/files/${fileId}...`);
  const deleteRes = await fetch(`${BASE_URL}/api/files/${fileId}`, {
    method: 'DELETE',
  });
  if (!deleteRes.ok) {
    console.error(`File delete failed: ${deleteRes.status} ${await deleteRes.text()}`);
    process.exit(1);
  }
  console.log('✓ File deleted successfully!');

  // ------------------------------------------------------------------------
  // 4. SOURCE OF TRUTH FLOW: CREATE -> UPDATE -> GET
  // ------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('Phase 4: Source of Truth (Create -> Update -> Get)');
  console.log('------------------------------------------------------------------------');

  // Create SoT
  console.log(`[POST] /api/projects/${projectId}/source-of-truth...`);
  const sotCreateRes = await fetch(`${BASE_URL}/api/projects/${projectId}/source-of-truth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Initial Requirements Document for Stripe Integration' }),
  });
  if (!sotCreateRes.ok) {
    console.error(`SoT creation failed: ${sotCreateRes.status} ${await sotCreateRes.text()}`);
    process.exit(1);
  }
  const sotData = await sotCreateRes.json();
  sotId = sotData.id;
  console.log(`✓ Source of Truth created! ID: ${sotId}`);
  expectValue(sotData.content, 'Initial Requirements Document for Stripe Integration');
  expectValue(sotData.versionNumber, 1);

  // Update SoT
  console.log(`[PUT] /api/projects/${projectId}/source-of-truth...`);
  const sotUpdateRes = await fetch(`${BASE_URL}/api/projects/${projectId}/source-of-truth`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Updated Specs: Authentication must use Auth0 and payment must use Stripe' }),
  });
  if (!sotUpdateRes.ok) {
    console.error(`SoT update failed: ${sotUpdateRes.status} ${await sotUpdateRes.text()}`);
    process.exit(1);
  }
  const sotUpdateData = await sotUpdateRes.json();
  console.log('✓ Source of Truth updated (Version history generated)!');
  expectValue(sotUpdateData.content, 'Updated Specs: Authentication must use Auth0 and payment must use Stripe');
  expectValue(sotUpdateData.versionNumber, 2);
  expectArrayLength(sotUpdateData.versionHistory, 1);
  expectValue(sotUpdateData.versionHistory[0].content, 'Initial Requirements Document for Stripe Integration');

  // Get SoT
  console.log(`[GET] /api/projects/${projectId}/source-of-truth?includeHistoryContent=true...`);
  const sotGetRes = await fetch(`${BASE_URL}/api/projects/${projectId}/source-of-truth?includeHistoryContent=true`);
  const sotGetData = await sotGetRes.json();
  console.log('✓ Successfully retrieved Source of Truth!');
  expectValue(sotGetData.id, sotId);

  // ------------------------------------------------------------------------
  // 5. WBS CONFIG FLOW: SAVE -> GET
  // ------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('Phase 5: WBS Configuration (Save -> Get)');
  console.log('------------------------------------------------------------------------');

  const wbsConfigPayload = {
    techStack: {
      languages: ['TypeScript', 'Go'],
      frameworks: ['Next.js', 'Gin'],
      databases: ['MongoDB'],
      cloud: ['AWS', 'Docker'],
    },
    teamComposition: '2 Fullstack Devs, 1 QA',
    compliance: ['GDPR', 'OWASP Top 10'],
    integrations: ['Stripe', 'Auth0'],
    timeline: {
      expectedDurationMonths: 3,
      sprintLengthWeeks: 2,
    },
  };

  // Save Config
  console.log(`[PUT] /api/projects/${projectId}/wbs/config...`);
  const saveConfigRes = await fetch(`${BASE_URL}/api/projects/${projectId}/wbs/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wbsConfigPayload),
  });
  if (!saveConfigRes.ok) {
    console.error(`Save config failed: ${saveConfigRes.status} ${await saveConfigRes.text()}`);
    process.exit(1);
  }
  const configData = await saveConfigRes.json();
  console.log('✓ WBS Configuration saved successfully!');
  expectValue(configData.techStack.languages[0], 'TypeScript');
  expectValue(configData.teamComposition, '2 Fullstack Devs, 1 QA');

  // Get Config
  console.log(`[GET] /api/projects/${projectId}/wbs/config...`);
  const getConfigRes = await fetch(`${BASE_URL}/api/projects/${projectId}/wbs/config`);
  const getConfigData = await getConfigRes.json();
  console.log('✓ Retrieved WBS Configuration matches saved specs!');
  expectValue(getConfigData.projectId, projectId);

  // ------------------------------------------------------------------------
  // 6. WBS BREAKDOWN FLOW: CREATE TASK -> TRIGGER AI BREAKDOWN -> VERIFY
  // ------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('Phase 6: AI-Powered WBS Task Breakdown (Create Task -> Breakdown -> Verify)');
  console.log('------------------------------------------------------------------------');

  // Connect to MongoDB to seed a task for breakdown
  // Note: We need a Level 3 WBS Task to perform the breakdown on.
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apmp');
  const taskModel = mongoose.models.WBSItem || mongoose.model('WBSItem', new mongoose.Schema({}, { strict: false }));
  
  const createdTaskDoc = await taskModel.create({
    projectId: new mongoose.Types.ObjectId(projectId),
    title: 'Develop secure Stripe checkout page',
    description: 'Create responsive UI and robust backend handler using Stripe SDK.',
    type: 'task',
    status: 'pending',
    order: 0,
    aiGenerated: false,
  });

  taskId = createdTaskDoc._id.toString();
  console.log(`✓ Seeded Level 3 Task: "${createdTaskDoc.title}" (ID: ${taskId})`);

  // Trigger AI breakdown
  console.log(`[POST] /api/wbs/${taskId}/breakdown (AI generation)...`);
  const breakdownRes = await fetch(`${BASE_URL}/api/wbs/${taskId}/breakdown`, {
    method: 'POST',
  });
  if (!breakdownRes.ok) {
    console.error(`AI Breakdown failed: ${breakdownRes.status} ${await breakdownRes.text()}`);
    // Cleanup and exit
    await mongoose.connection.close();
    process.exit(1);
  }
  const subtasks = await breakdownRes.json();
  console.log(`✓ AI Breakdown generated ${subtasks.length} subtasks!`);
  expectArrayLengthGreaterThan(subtasks, 0);
  subtasks.forEach((sub: any, i: number) => {
    console.log(`  - Subtask ${i + 1}: "${sub.title}"`);
  });

  // ------------------------------------------------------------------------
  // 7. EXPORT FLOW: GITHUB / JIRA SYNC & VERIFICATION
  // ------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('Phase 7: GitHub & Jira Export Integration Sync');
  console.log('------------------------------------------------------------------------');

  // 7a. GitHub Export
  const ghToken = process.env.E2E_GITHUB_TOKEN;
  const ghOwner = process.env.E2E_GITHUB_OWNER;
  const ghRepo = process.env.E2E_GITHUB_REPO;

  if (ghToken && ghOwner && ghRepo) {
    console.log(`[POST] /api/github/export to ${ghOwner}/${ghRepo}...`);
    const ghExportRes = await fetch(`${BASE_URL}/api/github/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wbsItemId: taskId,
        owner: ghOwner,
        repo: ghRepo,
        token: ghToken,
      }),
    });
    if (ghExportRes.ok) {
      const ghExportData = await ghExportRes.json();
      console.log('✓ GITHUB SYNC SUCCESSFUL!');
      console.log(`  - Issue Number: ${ghExportData.externalId}`);
      console.log(`  - Issue URL:    ${ghExportData.externalUrl}`);
    } else {
      console.warn(`⚠️ GitHub export failed: ${ghExportRes.status} ${await ghExportRes.text()}`);
    }
  } else {
    console.log('Skipping GitHub export due to missing credentials in .env.local');
  }

  // 7b. Jira Export (Basic Auth)
  const jiraToken = process.env.E2E_JIRA_TOKEN;
  const jiraEmail = process.env.E2E_JIRA_EMAIL;
  const jiraDomain = process.env.E2E_JIRA_DOMAIN;
  const jiraProjectKey = process.env.E2E_JIRA_PROJECT_KEY;

  if (jiraToken && jiraEmail && jiraDomain && jiraProjectKey) {
    console.log(`[POST] /api/jira/export to ${jiraDomain} (Basic Auth)...`);
    const jiraExportRes = await fetch(`${BASE_URL}/api/jira/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wbsItemId: taskId,
        apiToken: jiraToken,
        email: jiraEmail,
        domain: jiraDomain,
        projectKey: jiraProjectKey,
        issueType: 'Task',
      }),
    });
    if (jiraExportRes.ok) {
      const jiraExportData = await jiraExportRes.json();
      console.log('✓ JIRA SYNC SUCCESSFUL!');
      console.log(`  - Issue Key: ${jiraExportData.externalId}`);
      console.log(`  - Issue URL: ${jiraExportData.externalUrl}`);
    } else {
      console.warn(`⚠️ Jira export failed: ${jiraExportRes.status} ${await jiraExportRes.text()}`);
    }
  } else {
    console.log('Skipping Jira export due to missing credentials in .env.local');
  }

  // ------------------------------------------------------------------------
  // 8. CONFLICT DETECTION FLOW: TRIGGER -> VERIFY
  // ------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('Phase 8: Conflict & Ambiguity Detection (Trigger -> Verify)');
  console.log('------------------------------------------------------------------------');

  // Let's seed a diagram file with a contradiction to trigger detection
  const fileModel = mongoose.models.File || mongoose.model('File', new mongoose.Schema({}, { strict: false }));
  await fileModel.create({
    projectId: new mongoose.Types.ObjectId(projectId),
    userId: new mongoose.Types.ObjectId(regData.user.id),
    originalName: 'auth_workflow.png',
    contentType: 'image/png',
    fileData: Buffer.from('fake binary image content'),
    content: 'graph TD; Login --> BypassedMFA;', // contradictory to HIPAA/Auth0
    createdAt: new Date(),
  });
  console.log('✓ Seeded contradictory flowchart workflow diagram.');

  console.log(`[POST] /api/projects/${projectId}/conflicts...`);
  const conflictsRes = await fetch(`${BASE_URL}/api/projects/${projectId}/conflicts`, {
    method: 'POST',
  });
  if (!conflictsRes.ok) {
    console.error(`Conflicts analysis failed: ${conflictsRes.status} ${await conflictsRes.text()}`);
  } else {
    const conflictReports = await conflictsRes.json();
    console.log(`✓ Conflict analysis complete! Found ${conflictReports.length} contradictions/ambiguities:`);
    conflictReports.forEach((rep: any, i: number) => {
      console.log(`  [Conflict #${i + 1}]`);
      console.log(`  - Type:        ${rep.type}`);
      console.log(`  - Severity:    ${rep.severity}`);
      console.log(`  - Description: ${rep.description}`);
      console.log(`  - Explanation: ${rep.llmExplanation}`);
      console.log(`  - Suggested:   ${rep.suggestedFix}`);
    });
  }

  // Cleanup seeded database records
  await taskModel.deleteMany({ projectId });
  await fileModel.deleteMany({ projectId });
  await taskModel.deleteOne({ _id: taskId });
  await mongoose.connection.close();

  console.log('\n========================================================================');
  console.log('            COMPREHENSIVE E2E FUNCTIONALITY EVALUATION COMPLETED        ');
  console.log('========================================================================');
}

// Simple assertion helpers
function expectField(obj: any, fieldName: string) {
  if (!obj || obj[fieldName] === undefined) {
    throw new Error(`Assertion failed: Expected object to have field "${fieldName}". Object: ${JSON.stringify(obj)}`);
  }
}

function expectValue(val: any, expected: any) {
  if (val !== expected) {
    throw new Error(`Assertion failed: Expected value to be "${expected}", but got "${val}"`);
  }
}

function expectArrayLength(arr: any[], len: number) {
  if (!Array.isArray(arr) || arr.length !== len) {
    throw new Error(`Assertion failed: Expected array of length ${len}, but got ${arr?.length}`);
  }
}

function expectArrayLengthGreaterThan(arr: any[], minLen: number) {
  if (!Array.isArray(arr) || arr.length <= minLen) {
    throw new Error(`Assertion failed: Expected array of length > ${minLen}, but got ${arr?.length}`);
  }
}

runE2E().catch(err => {
  console.error('E2E Evaluation failed with fatal error:', err);
  process.exit(1);
});
