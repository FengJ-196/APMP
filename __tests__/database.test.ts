import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import User from '../lib/models/User';
import Project from '../lib/models/Project';
import File from '../lib/models/File';

describe('Database Integration', () => {
  beforeAll(async () => {
    await dbConnect();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should successfully connect to the local MongoDB instance', () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  it('should be able to create and retrieve a user', async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const user = await User.create({
      email: testEmail,
      passwordHash: 'hashed-password',
    });

    expect(user._id).toBeDefined();
    expect(user.email).toBe(testEmail);

    const found = await User.findOne({ email: testEmail });
    expect(found).toBeDefined();
    expect(found!.email).toBe(testEmail);
  });

  it('should enforce unique constraint on user email', async () => {
    const email = 'duplicate@example.com';
    await User.create({ email, passwordHash: 'p1' });
    
    await expect(User.create({ email, passwordHash: 'p2' })).rejects.toThrow();
  });

  it('should be able to create a project with a user reference', async () => {
    const user = await User.create({ email: `proj-owner-${Date.now()}@test.com`, passwordHash: 'pw' });
    
    const project = await Project.create({
      title: 'Integration Project',
      userId: user._id,
    });

    expect(project.userId.toString()).toBe(user._id.toString());
    
    const found = await Project.findById(project._id).populate('userId');
    expect((found.userId as any).email).toBe(user.email);
  });

  it('should cleanup test data', async () => {
    await User.deleteMany({ email: /@example.com|@test.com/ });
    await Project.deleteMany({ title: 'Integration Project' });
  });
});
