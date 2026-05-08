import { NextRequest, NextResponse } from 'next/server';
import { findProjectsByUserId } from '@/lib/models/projects';

/**
 * GET /api/projects
 * Returns all projects for a user.
 */
export async function GET(request: NextRequest) {
  try {
    const projects = await findProjectsByUserId('645a1b2c3d4e5f6a7b8c9d0e'); // Mock userId
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
