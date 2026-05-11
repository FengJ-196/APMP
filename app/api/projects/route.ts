import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/lib/services/ProjectService';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.userId && !mongoose.Types.ObjectId.isValid(body.userId)) {
      body.userId = new mongoose.Types.ObjectId().toString();
    } else if (!body.userId) {
      body.userId = new mongoose.Types.ObjectId().toString();
    }

    const project = await ProjectService.createProject(body);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Project creation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}
