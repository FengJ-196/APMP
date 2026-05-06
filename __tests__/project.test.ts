/**
 * TDD — RED Phase: Project Model Tests
 *
 * Tests for creating and accessing the Project model.
 * Written BEFORE the store implementation exists.
 *
 * Validates:
 *  - Project creation with all required attributes
 *  - Default values (status, created_at)
 *  - Access by id, by user_id
 *  - Attribute shape and types (MongoDB-ready)
 *  - Edge cases and validation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProject,
  findProjectById,
  findProjectsByUserId,
  clearProjects,
} from '@/lib/models/projects';
import type { Project, CreateProjectInput } from '@/lib/models/types';

describe('Project Model', () => {
  beforeEach(() => {
    clearProjects();
  });

  // ─── Creation ───────────────────────────────────────

  describe('createProject', () => {
    it('should create a project with all required attributes', () => {
      const input: CreateProjectInput = {
        title: 'APMP Platform',
        user_id: 'user-abc-123',
      };

      const project = createProject(input);

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.title).toBe('APMP Platform');
      expect(project.user_id).toBe('user-abc-123');
      expect(project.status).toBeDefined();
      expect(project.created_at).toBeDefined();
    });

    it('should generate a 24-character hex id (MongoDB ObjectId format)', () => {
      const project = createProject({
        title: 'Test Project',
        user_id: 'user-1',
      });

      expect(project.id).toMatch(/^[a-f0-9]{24}$/);
    });

    it('should default status to "active" when not provided', () => {
      const project = createProject({
        title: 'Default Status',
        user_id: 'user-1',
      });

      expect(project.status).toBe('active');
    });

    it('should accept an explicit status value', () => {
      const project = createProject({
        title: 'Archived Project',
        user_id: 'user-1',
        status: 'archived',
      });

      expect(project.status).toBe('archived');
    });

    it('should set created_at to a Date instance at creation time', () => {
      const before = new Date();
      const project = createProject({
        title: 'Timed Project',
        user_id: 'user-1',
      });
      const after = new Date();

      expect(project.created_at).toBeInstanceOf(Date);
      expect(project.created_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(project.created_at.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should generate unique ids for different projects', () => {
      const p1 = createProject({ title: 'Project A', user_id: 'user-1' });
      const p2 = createProject({ title: 'Project B', user_id: 'user-1' });
      const p3 = createProject({ title: 'Project C', user_id: 'user-2' });

      const ids = [p1.id, p2.id, p3.id];
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('should allow creating multiple projects for the same user', () => {
      createProject({ title: 'Project 1', user_id: 'user-1' });
      createProject({ title: 'Project 2', user_id: 'user-1' });
      createProject({ title: 'Project 3', user_id: 'user-1' });

      const userProjects = findProjectsByUserId('user-1');
      expect(userProjects).toHaveLength(3);
    });
  });

  // ─── Access by ID ───────────────────────────────────

  describe('findProjectById', () => {
    it('should find a project by its id', () => {
      const created = createProject({
        title: 'Findable Project',
        user_id: 'user-1',
      });

      const found = findProjectById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe('Findable Project');
      expect(found!.user_id).toBe('user-1');
    });

    it('should return undefined for a non-existent id', () => {
      const found = findProjectById('000000000000000000000000');
      expect(found).toBeUndefined();
    });

    it('should return a project with all expected attributes', () => {
      const created = createProject({
        title: 'Full Attributes',
        user_id: 'user-42',
        status: 'completed',
      });

      const found = findProjectById(created.id);

      // Verify the full shape satisfies the Project interface
      expect(found).toMatchObject({
        id: expect.any(String),
        title: 'Full Attributes',
        user_id: 'user-42',
        status: 'completed',
        created_at: expect.any(Date),
      } satisfies Record<keyof Project, unknown>);
    });
  });

  // ─── Access by User ID ──────────────────────────────

  describe('findProjectsByUserId', () => {
    it('should return all projects belonging to a user', () => {
      createProject({ title: 'User1 - A', user_id: 'user-1' });
      createProject({ title: 'User1 - B', user_id: 'user-1' });
      createProject({ title: 'User2 - A', user_id: 'user-2' });

      const user1Projects = findProjectsByUserId('user-1');
      const user2Projects = findProjectsByUserId('user-2');

      expect(user1Projects).toHaveLength(2);
      expect(user2Projects).toHaveLength(1);
      expect(user1Projects.every((p) => p.user_id === 'user-1')).toBe(true);
      expect(user2Projects[0].title).toBe('User2 - A');
    });

    it('should return an empty array for a user with no projects', () => {
      const projects = findProjectsByUserId('user-ghost');
      expect(projects).toEqual([]);
    });

    it('should not return projects from other users', () => {
      createProject({ title: 'Mine', user_id: 'user-A' });
      createProject({ title: 'Theirs', user_id: 'user-B' });

      const result = findProjectsByUserId('user-A');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Mine');
    });
  });

  // ─── Attribute Integrity ────────────────────────────

  describe('attribute types (MongoDB-ready)', () => {
    it('id should be a 24-char hex string matching ObjectId format', () => {
      const project = createProject({ title: 'Type Check', user_id: 'u1' });
      expect(typeof project.id).toBe('string');
      expect(project.id).toHaveLength(24);
      expect(project.id).toMatch(/^[a-f0-9]{24}$/);
    });

    it('title should be a string', () => {
      const project = createProject({ title: 'String Title', user_id: 'u1' });
      expect(typeof project.title).toBe('string');
    });

    it('user_id should be a string', () => {
      const project = createProject({ title: 'Ref Check', user_id: 'user-ref-99' });
      expect(typeof project.user_id).toBe('string');
    });

    it('status should be one of the allowed values', () => {
      const allowed = ['active', 'archived', 'completed'];
      const project = createProject({ title: 'Status Check', user_id: 'u1' });
      expect(allowed).toContain(project.status);
    });

    it('created_at should be a Date instance', () => {
      const project = createProject({ title: 'Date Check', user_id: 'u1' });
      expect(project.created_at).toBeInstanceOf(Date);
    });
  });

  // ─── Clear ──────────────────────────────────────────

  describe('clearProjects', () => {
    it('should remove all projects', () => {
      createProject({ title: 'Temp 1', user_id: 'u1' });
      createProject({ title: 'Temp 2', user_id: 'u2' });

      clearProjects();

      expect(findProjectsByUserId('u1')).toEqual([]);
      expect(findProjectsByUserId('u2')).toEqual([]);
    });
  });
});
