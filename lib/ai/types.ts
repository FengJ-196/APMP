export interface ConflictReport {
  id: string;
  type: "Contradiction" | "Ambiguity" | "Duplicate";
  severity: "High" | "Medium" | "Low";
  description: string;
  sourceReferences: {
    textSnippets: string[];
    imageIds: string[];
  };
  llmExplanation: string;
  suggestedFix: string;
}

export interface DiagramToMermaidResult {
  mermaidCode: string;
  confidence: number;
  explanation?: string;
}

export interface TextToMarkdownResult {
  markdown: string;
  confidence: number;
}

/**
 * Interface for AI service providers (e.g., Gemini, OpenAI, Anthropic)
 */
export interface IAIServiceProvider {
  /**
   * Converts an image of a diagram (flowchart, sequence, etc.) to Mermaid.js code.
   */
  convertDiagramToMermaid(imageBuffer: Buffer, mimeType: string): Promise<DiagramToMermaidResult>;

  /**
   * Converts an image of a diagram to Mermaid.js code with streaming.
   */
  convertDiagramToMermaidStream(imageBuffer: Buffer, mimeType: string): AsyncIterable<string>;

  /**
   * Converts multiple images to Mermaid.js code in a single batch.
   */
  convertBatchDiagramsToMermaid(images: Array<{ buffer: Buffer, mimeType: string }>): Promise<string[]>;

  /**
   * Analyzes an SRS document (text + diagrams) for logical conflicts, ambiguities, and contradictions.
   */
  analyzeConflicts(text: string, diagrams: Array<{ id: string, mermaid: string, caption: string }>): Promise<ConflictReport[]>;

  /**
   * Analyzes an SRS document for logical conflicts with streaming chunks.
   */
  analyzeConflictsStream(text: string, diagrams: Array<{ id: string, mermaid: string, caption: string }>): AsyncIterable<string>;

  /**
   * Reformats unstructured text into clean, hierarchical Markdown.
   */
  reformatToMarkdown(text: string): Promise<TextToMarkdownResult>;

  /**
   * Generates a 4-level Work Breakdown Structure (WBS) from requirements and project constraints.
   */
  generateWBS(sourceOfTruth: string, config: any): Promise<any[]>;

  /**
   * Generates a WBS structure streaming reasoning and JSON chunks.
   */
  generateWBSStream(sourceOfTruth: string, config: any): AsyncIterable<string>;

  /**
   * Decomposes a Level 3 Task into concrete Level 4 developer subtasks.
   */
  generateDeveloperSubtasks(task: any, config: any, sourceOfTruth: string): Promise<any[]>;

  /**
   * Estimates story points for a task given a set of historical RAG analog references.
   */
  estimateStoryPoints(
    taskTitle: string,
    taskDescription: string,
    references: Array<{ title: string; description: string; points: number }>
  ): Promise<{ suggestedPoints: number; rationale: string; confidence: number }>;
}

/**
 * AI Configuration Interface
 */
export interface AIConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek';
  apiKey: string;
  modelName?: string;
}
