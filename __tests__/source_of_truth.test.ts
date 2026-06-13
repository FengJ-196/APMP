import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { SourceOfTruthService } from '@/lib/services/SourceOfTruthService';
import SourceOfTruthModel from '@/lib/models/SourceOfTruth';
import { createProject, clearProjects } from '@/lib/models/Project';
import { GET, POST, PUT } from '@/app/api/projects/[id]/source-of-truth/route';
import { NextRequest } from 'next/server';

describe('Source of Truth (SoT) Module', () => {
  let projectId: string;
  const mockUserId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    await dbConnect();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await clearProjects();
    await SourceOfTruthModel.deleteMany({});
    
    const project = await createProject({
      title: 'SoT Test Project',
      userId: mockUserId,
    });
    projectId = project.id;
  });

  describe('Unit Level Tests (SourceOfTruthService)', () => {
    it('S1: should create SoT with valid projectId + content', async () => {
      const sot = await SourceOfTruthService.createSourceOfTruth({
        projectId,
        content: 'Initial project specs and aims.',
      });

      expect(sot).toBeDefined();
      expect(sot.id).toBeDefined();
      expect(sot.projectId).toBe(projectId);
      expect(sot.content).toBe('Initial project specs and aims.');
      expect(sot.versionNumber).toBe(1);
      expect(sot.versionHistory).toHaveLength(0);
    });

    it('S2: should throw when creating SoT with missing projectId', async () => {
      await expect(
        SourceOfTruthService.createSourceOfTruth({
          projectId: '',
          content: 'No project',
        })
      ).rejects.toThrow(/Project ID is required/);
    });

    it('S3: should get SoT by project ID', async () => {
      await SourceOfTruthService.createSourceOfTruth({
        projectId,
        content: 'Find me!',
      });

      const sot = await SourceOfTruthService.getSourceOfTruthByProjectId(projectId);
      expect(sot).toBeDefined();
      expect(sot!.content).toBe('Find me!');
    });

    it('S4: should return undefined for non-existent project ID', async () => {
      const ghostId = new mongoose.Types.ObjectId().toString();
      const sot = await SourceOfTruthService.getSourceOfTruthByProjectId(ghostId);
      expect(sot).toBeUndefined();
    });

    it('S5: should update SoT content and manage versioning / history', async () => {
      const sot = await SourceOfTruthService.createSourceOfTruth({
        projectId,
        content: 'Version 1',
      });

      // Update to Version 2
      const update1 = await SourceOfTruthService.updateSourceOfTruth(sot.id, 'Version 2');
      expect(update1.updated).toBe(true);
      expect(update1.data.content).toBe('Version 2');
      expect(update1.data.versionNumber).toBe(2);
      expect(update1.data.versionHistory).toHaveLength(1);
      expect(update1.data.versionHistory[0].content).toBe('Version 1');
      expect(update1.data.versionHistory[0].versionNumber).toBe(1);

      // Update to Version 3
      const update2 = await SourceOfTruthService.updateSourceOfTruth(sot.id, 'Version 3');
      expect(update2.updated).toBe(true);
      expect(update2.data.content).toBe('Version 3');
      expect(update2.data.versionNumber).toBe(3);
      expect(update2.data.versionHistory).toHaveLength(2);
      expect(update2.data.versionHistory[1].content).toBe('Version 2');
    });

    it('S6: should throw validation error when updating with non-string content', async () => {
      const sot = await SourceOfTruthService.createSourceOfTruth({
        projectId,
        content: 'Start',
      });

      await expect(
        SourceOfTruthService.updateSourceOfTruth(sot.id, undefined as any)
      ).rejects.toThrow(/Content must be a string/);
    });
  });

  describe('Integration / API Route Tests', () => {
    it('S7 & S9: should handle POST /api/projects/:id/source-of-truth and retrieve it via GET', async () => {
      const postReq = new NextRequest(`http://localhost:3000/api/projects/${projectId}/source-of-truth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'API Seeding Content' }),
      });

      const postRes = await POST(postReq, { params: Promise.resolve({ id: projectId }) });
      const postData = await postRes.json();

      expect(postRes.status).toBe(201);
      expect(postData.content).toBe('API Seeding Content');

      const getReq = new NextRequest(`http://localhost:3000/api/projects/${projectId}/source-of-truth`);
      const getRes = await GET(getReq, { params: Promise.resolve({ id: projectId }) });
      const getData = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getData.content).toBe('API Seeding Content');
    });

    it('S8: should support GET with includeHistoryContent=true/false', async () => {
      const sot = await SourceOfTruthService.createSourceOfTruth({
        projectId,
        content: 'Original',
      });
      await SourceOfTruthService.updateSourceOfTruth(sot.id, 'Updated');

      // includeHistoryContent = false
      const getReqNoHistory = new NextRequest(`http://localhost:3000/api/projects/${projectId}/source-of-truth?includeHistoryContent=false`);
      const resNoHistory = await GET(getReqNoHistory, { params: Promise.resolve({ id: projectId }) });
      const dataNoHistory = await resNoHistory.json();
      expect(dataNoHistory.versionHistory[0].content).toBeUndefined();

      // includeHistoryContent = true
      const getReqWithHistory = new NextRequest(`http://localhost:3000/api/projects/${projectId}/source-of-truth?includeHistoryContent=true`);
      const resWithHistory = await GET(getReqWithHistory, { params: Promise.resolve({ id: projectId }) });
      const dataWithHistory = await resWithHistory.json();
      expect(dataWithHistory.versionHistory[0].content).toBe('Original');
    });

    it('S10: should update content via PUT', async () => {
      await SourceOfTruthService.createSourceOfTruth({
        projectId,
        content: 'Before PUT',
      });

      const putReq = new NextRequest(`http://localhost:3000/api/projects/${projectId}/source-of-truth`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'After PUT' }),
      });

      const putRes = await PUT(putReq, { params: Promise.resolve({ id: projectId }) });
      const putData = await putRes.json();

      expect(putRes.status).toBe(200);
      expect(putData.content).toBe('After PUT');
      expect(putData.versionNumber).toBe(2);
    });

    it('S11: should return HTTP 404 for non-existent project on PUT/GET', async () => {
      const ghostId = new mongoose.Types.ObjectId().toString();

      const getReq = new NextRequest(`http://localhost:3000/api/projects/${ghostId}/source-of-truth`);
      const getRes = await GET(getReq, { params: Promise.resolve({ id: ghostId }) });
      expect(getRes.status).toBe(404);

      const putReq = new NextRequest(`http://localhost:3000/api/projects/${ghostId}/source-of-truth`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'PUT on Ghost' }),
      });
      const putRes = await PUT(putReq, { params: Promise.resolve({ id: ghostId }) });
      expect(putRes.status).toBe(404);
    });
  });
});
