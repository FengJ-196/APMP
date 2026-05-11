import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/lib/services/ProjectService';

export async function GET(request: NextRequest) {
  try {
    // Support passing userId via query parameter, or fall back to mock
    const userId = request.nextUrl.searchParams.get('userId') || '645a1b2c3d4e5f6a7b8c9d0e';
    const projects = await ProjectService.getProjectsByUserId(userId);
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
