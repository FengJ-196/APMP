import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/lib/services/ProjectService';
import { WBSConfigService } from '@/lib/services/WBSConfigService';
import type { WBSConfigDTO } from '@/dtos';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Check if the project exists
    const project = await ProjectService.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Try to retrieve the existing configuration
    const config = await WBSConfigService.getWBSConfigByProjectId(projectId);

    // If none exists, return an in-memory default preset (avoiding database persistence)
    if (!config) {
      const defaultWBSConfig: WBSConfigDTO = {
        id: 'default',
        projectId,
        techStack: {
          languages: [],
          frameworks: [],
          databases: [],
          cloud: [],
        },
        teamComposition: '',
        compliance: [],
        integrations: [],
        timeline: {},
        createdAt: new Date(0),
        updatedAt: new Date(0),
      };
      return NextResponse.json(defaultWBSConfig);
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('WBSConfig GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch WBS configuration' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Check if the project exists
    const project = await ProjectService.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();

    const config = await WBSConfigService.saveWBSConfig(projectId, body);

    return NextResponse.json(config);
  } catch (error) {
    console.error('WBSConfig PUT error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save WBS configuration';
    
    if (errorMessage.includes('Invalid WBS Configuration payload') || errorMessage.includes('Invalid project ID format')) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
