import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import {
  User,
  Project,
  File,
  SourceOfTruth,
  Issue,
  WBSItem,
  StoryPoint,
  ExternalSync
} from '../lib/models';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define MONGODB_URI in .env.local');
  process.exit(1);
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);

  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    File.deleteMany({}),
    SourceOfTruth.deleteMany({}),
    Issue.deleteMany({}),
    WBSItem.deleteMany({}),
    StoryPoint.deleteMany({}),
    ExternalSync.deleteMany({}),
  ]);

  // 1. Create User
  console.log('Seeding User...');
  const user = await User.create({
    email: 'admin@apmp.ai',
    passwordHash: '$2a$12$LhO6.X5Tz8U6z1K8X1H1O.w1y1H1H1H1H1H1H1H1H1H1H1', // Mock hash
  });

  // 2. Create Project
  console.log('Seeding Project...');
  const project = await Project.create({
    title: 'AIMS Store Expansion',
    userId: user._id,
    status: 'active',
  });

  // 3. Create File (Mock binary data)
  console.log('Seeding File...');
  const file = await File.create({
    projectId: project._id,
    userId: user._id,
    originalName: 'AIMS_SRS_v1.pdf',
    contentType: 'application/pdf',
    fileData: Buffer.from('mock-pdf-content'),
  });

  // 4. Create Source of Truth
  console.log('Seeding Source of Truth...');
  const sut = await SourceOfTruth.create({
    projectId: project._id,
    fileId: file._id,
    versionNumber: 1,
    status: 'under_review',
    compiledMarkdown: '# AIMS Store Requirements\n\n## blk_1: System Login\nUsers must be able to login...',
    blocks: [
      {
        blockId: 'blk_1',
        order: 1,
        type: 'heading',
        markdown: '# AIMS Store Requirements',
        userVerified: true,
      },
      {
        blockId: 'blk_2',
        order: 2,
        type: 'text',
        markdown: 'The system shall allow users to browse products.',
        userVerified: true,
        originalAiContent: 'The system will let people look at items.',
      },
      {
        blockId: 'blk_3',
        order: 3,
        type: 'diagram',
        diagram: {
          mermaidCode: 'graph TD\nA[User] --> B(Login)',
          diagramType: 'flowchart',
          confidence: 0.95,
        },
        userVerified: false,
      }
    ]
  });

  // 5. Create Issues
  console.log('Seeding Issues...');
  await Issue.create({
    projectId: project._id,
    sourceOfTruthId: sut._id,
    description: 'Contradiction between requirement blk_2 and existing inventory logic.',
    type: 'Contradiction',
    status: 'new',
    severity: 'High',
    sourceReferences: ['blk_2'],
    suggestion: 'Verify if Guest browsing is allowed.',
  });

  // 6. Create WBS Items (Tree Structure)
  console.log('Seeding WBS Items...');
  const epic = await WBSItem.create({
    projectId: project._id,
    title: 'User Management',
    type: 'epic',
    status: 'approved',
    order: 1,
    aiGenerated: false,
  });

  const story = await WBSItem.create({
    projectId: project._id,
    parentId: epic._id,
    sourceOfTruthId: sut._id,
    title: 'Login Implementation',
    type: 'story',
    status: 'reviewed',
    sourceRequirements: ['blk_1'],
    acceptanceCriteria: ['Must support JWT', 'Must lock after 5 attempts'],
    order: 1,
    aiGenerated: true,
  });

  // 7. Create Story Points
  console.log('Seeding Story Points...');
  await StoryPoint.create({
    wbsItemId: story._id,
    projectId: project._id,
    aiSuggestedPoints: 5,
    finalPoints: 3,
    confidence: 0.85,
    rationale: 'Similar to Auth module in Project X but without LDAP integration.',
    ragReferences: [
      {
        similarProjectId: new mongoose.Types.ObjectId(),
        similarItemTitle: 'Basic Login',
        similarItemPoints: 3,
        similarityScore: 0.92,
      }
    ],
    decidedBy: user._id,
  });

  // 8. Create External Sync
  console.log('Seeding External Sync...');
  await ExternalSync.create({
    projectId: project._id,
    wbsItemId: story._id,
    platform: 'jira',
    externalId: 'AIMS-101',
    externalUrl: 'https://aims.atlassian.net/browse/AIMS-101',
    syncStatus: 'synced',
  });

  console.log('Seeding completed successfully!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
