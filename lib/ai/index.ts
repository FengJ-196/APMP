import { IAIServiceProvider } from './types';
import { GeminiProvider } from './providers/GeminiProvider';
import { OpenRouterGatewayProvider } from './providers/OpenRouterGatewayProvider';
import { TaskRoutingMap, DEFAULT_ROUTING_MAP } from './routerTypes';

/**
 * AI Service entry point.
 */
export class AIService {
  private static instance: AIService;
  private provider: IAIServiceProvider | null = null;

  private constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    const providerType = process.env.AI_PROVIDER || 'gemini';

    if (providerType === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_OTHER_API_KEY || '';
      if (apiKey) {
        this.provider = new GeminiProvider(apiKey);
      }
    } else if (providerType === 'deepseek') {
      const apiKey = process.env.OPENROUTER_API_KEY || '';
      if (apiKey) {
        this.provider = new OpenRouterGatewayProvider(apiKey, DEFAULT_ROUTING_MAP);
      }
    }
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Dynamically hot-swap active routing configurations at runtime.
   */
  public updateRouting(newMap: TaskRoutingMap) {
    if (this.provider && this.provider instanceof OpenRouterGatewayProvider) {
      this.provider.updateRoutingMap(newMap);
    }
  }

  /**
   * Set the active AI provider (e.g., GeminiProvider, OpenAIProvider)
   */
  public setProvider(provider: IAIServiceProvider) {
    this.provider = provider;
  }

  /**
   * Convert image to Mermaid.js code
   */
  public async convertDiagramToMermaid(imageBuffer: Buffer, mimeType: string) {
    if (!this.provider) throw new Error('AI Provider not initialized. Check AI_PROVIDER, GEMINI_API_KEY, and OPENROUTER_API_KEY env vars.');
    return this.provider.convertDiagramToMermaid(imageBuffer, mimeType);
  }

  /**
   * Convert image to Mermaid.js code with streaming
   */
  public convertDiagramToMermaidStream(imageBuffer: Buffer, mimeType: string) {
    if (!this.provider) throw new Error('AI Provider not initialized');
    return this.provider.convertDiagramToMermaidStream(imageBuffer, mimeType);
  }

  /**
   * Convert multiple images to Mermaid.js code in a batch
   */
  public async convertBatchDiagramsToMermaid(images: Array<{ buffer: Buffer, mimeType: string }>) {
    if (!this.provider) throw new Error('AI Provider not initialized');
    return this.provider.convertBatchDiagramsToMermaid(images);
  }

  /**
   * Reformat unstructured text to Markdown
   */
  public async reformatToMarkdown(text: string) {
    if (!this.provider) throw new Error('AI Provider not initialized');
    return this.provider.reformatToMarkdown(text);
  }

  /**
   * Analyze SRS for conflicts and ambiguities
   */
  public async analyzeConflicts(text: string, diagrams: Array<{ id: string, mermaid: string, caption: string }>) {
    if (!this.provider) throw new Error('AI Provider not initialized');
    return this.provider.analyzeConflicts(text, diagrams);
  }

  /**
   * Analyze SRS for conflicts and ambiguities with streaming
   */
  public analyzeConflictsStream(text: string, diagrams: Array<{ id: string, mermaid: string, caption: string }>) {
    if (!this.provider) throw new Error('AI Provider not initialized');
    return this.provider.analyzeConflictsStream(text, diagrams);
  }

  /**
   * Decomposes the Source of Truth into a persistent 4-level Work Breakdown Structure (WBS)
   */
  public async generateWBS(sourceOfTruth: string, config: any): Promise<any[]> {
    if (!this.provider) throw new Error('AI Provider not initialized');
    return this.provider.generateWBS(sourceOfTruth, config);
  }

  /**
   * Generates a 4-level Work Breakdown Structure (WBS) streaming reasoning and JSON.
   */
  public generateWBSStream(sourceOfTruth: string, config: any): AsyncIterable<string> {
    if (!this.provider) throw new Error('AI Provider not initialized');
    return this.provider.generateWBSStream(sourceOfTruth, config);
  }

  /**
   * Decomposes a Level 3 Task into concrete Level 4 developer subtasks.
   */
  public async generateDeveloperSubtasks(task: any, config: any, sourceOfTruth: string): Promise<any[]> {
    if (!this.provider) throw new Error('AI Provider not initialized');
    return this.provider.generateDeveloperSubtasks(task, config, sourceOfTruth);
  }
}

export * from './types';
