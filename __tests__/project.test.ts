/**
 * Project Model Integration Tests
 * 
 * Updated to test against a live MongoDB instance.
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import {
  createProject,
  findProjectById,
  findProjectsByUserId,
  clearProjects,
} from '../lib/models/Project';
import type { CreateProjectInputDTO as CreateProjectInput } from '@/dtos';

describe('Project Model (MongoDB)', () => {
  beforeAll(async () => {
    await dbConnect();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await clearProjects();
  });

  describe('createProject', () => {
    it('should create a project with all required attributes', async () => {
      const input: CreateProjectInput = {
        title: 'APMP Platform',
        userId: new mongoose.Types.ObjectId().toString(),
      };

      const project = await createProject(input);

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.title).toBe('APMP Platform');
      expect(project.status).toBe('active');
    });

    it('should generate a 24-character hex id', async () => {
      const project = await createProject({
        title: 'Test Project',
        userId: new mongoose.Types.ObjectId().toString(),
      });

      expect(project.id).toMatch(/^[a-f0-9]{24}$/);
    });
  });

  describe('findProjectById', () => {
    it('should find a project by its id', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const created = await createProject({
        title: 'Findable Project',
        userId: userId,
      });

      const found = await findProjectById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe('Findable Project');
    });

    it('should return undefined for a non-existent id', async () => {
      const found = await findProjectById(new mongoose.Types.ObjectId().toString());
      expect(found).toBeUndefined();
    });
  });

  describe('findProjectsByUserId', () => {
    it('should return all projects belonging to a user', async () => {
      const u1 = new mongoose.Types.ObjectId().toString();
      const u2 = new mongoose.Types.ObjectId().toString();

      await createProject({ title: 'User1 - A', userId: u1 });
      await createProject({ title: 'User1 - B', userId: u1 });
      await createProject({ title: 'User2 - A', userId: u2 });

      const user1Projects = await findProjectsByUserId(u1);
      const user2Projects = await findProjectsByUserId(u2);

      expect(user1Projects).toHaveLength(2);
      expect(user2Projects).toHaveLength(1);
    });
  });
});
