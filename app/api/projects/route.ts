import { NextRequest, NextResponse } from 'next/server';
import { createProject } from '@/lib/models/projects';
import mongoose from 'mongoose';

/**
 * POST /api/projects
 * Creates a new project in MongoDB.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, userId } = body;

    if (!title) {
      return NextResponse.json({ error: 'Project title is required' }, { status: 400 });
    }

    // Use a valid ObjectId for the mock user if none provided or invalid
    const validUserId = mongoose.Types.ObjectId.isValid(userId) 
      ? userId 
      : new mongoose.Types.ObjectId().toString();

    const project = await createProject({
      title,
      userId: validUserId,
      status: 'active'
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Project creation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}
