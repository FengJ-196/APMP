import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai';
import { AITask, TaskRoutingMap, DEFAULT_ROUTING_MAP } from '@/lib/ai/routerTypes';

export const dynamic = 'force-dynamic';

// Global cache to persist custom routing maps in Next.js process lifecycle
const globalForRouting = global as unknown as {
  activeRoutingMap: TaskRoutingMap;
};

if (!globalForRouting.activeRoutingMap) {
  globalForRouting.activeRoutingMap = { ...DEFAULT_ROUTING_MAP };
}

// Ensure the active service is synchronized upon file module import
try {
  AIService.getInstance().updateRouting(globalForRouting.activeRoutingMap);
} catch (e) {
  console.warn('AIService dynamic routing hot-reload pending provider initialization.');
}

export async function GET() {
  return NextResponse.json({
    routingMap: globalForRouting.activeRoutingMap,
    defaultMap: DEFAULT_ROUTING_MAP,
    availableTasks: Object.values(AITask)
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { routingMap } = body;

    if (!routingMap || typeof routingMap !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid routingMap in request body.' },
        { status: 400 }
      );
    }

    // Validate keys and configurations
    const updatedMap = { ...globalForRouting.activeRoutingMap };
    
    for (const [taskKey, configVal] of Object.entries(routingMap)) {
      if (!Object.values(AITask).includes(taskKey as AITask)) {
        return NextResponse.json(
          { error: `Invalid AI Task identifier: "${taskKey}"` },
          { status: 400 }
        );
      }
      
      const config = configVal as any;
      if (!config.model || typeof config.model !== 'string') {
        return NextResponse.json(
          { error: `Task "${taskKey}" must specify a valid model string.` },
          { status: 400 }
        );
      }

      updatedMap[taskKey as AITask] = {
        model: config.model,
        temperature: config.temperature !== undefined ? parseFloat(config.temperature) : 0.2,
        maxTokens: config.maxTokens !== undefined ? parseInt(config.maxTokens) : 2048,
        fallbackModel: config.fallbackModel || undefined
      };
    }

    // Save configuration updates
    globalForRouting.activeRoutingMap = updatedMap;

    // Apply hot-reload on the active AI singleton provider
    AIService.getInstance().updateRouting(globalForRouting.activeRoutingMap);

    return NextResponse.json({
      success: true,
      routingMap: globalForRouting.activeRoutingMap
    });
  } catch (error) {
    console.error('Failed to update task routing config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
