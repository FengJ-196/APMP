export enum AITask {
  DIAGRAM_TO_MERMAID = 'diagram_to_mermaid',
  ANALYZE_CONFLICTS = 'analyze_conflicts',
  REFORMAT_MARKDOWN = 'reformat_markdown',
  GENERATE_WBS = 'generate_wbs',
  GENERATE_SUBTASKS = 'generate_subtasks'
}

export interface TaskRouteConfig {
  model: string;            // e.g., 'google/gemini-2.5-flash' or 'deepseek/deepseek-v4-flash:free'
  temperature?: number;     // e.g., 0.2
  maxTokens?: number;       // e.g., 2048
  fallbackModel?: string;   // Optional model if primary model experiences downtime
}

export type TaskRoutingMap = Record<AITask, TaskRouteConfig>;

export const DEFAULT_ROUTING_MAP: TaskRoutingMap = {
  [AITask.DIAGRAM_TO_MERMAID]: {
    model: 'google/gemini-2.5-flash',
    temperature: 0,
    maxTokens: 2048,
  },
  [AITask.ANALYZE_CONFLICTS]: {
    model: 'deepseek/deepseek-v4-flash',
    temperature: 0.1,
    maxTokens: 3000,
    fallbackModel: 'google/gemini-2.5-flash',
  },
  [AITask.REFORMAT_MARKDOWN]: {
    model: 'deepseek/deepseek-v4-flash',
    temperature: 0.2,
    maxTokens: 65536,
  },
  [AITask.GENERATE_WBS]: {
    model: 'deepseek/deepseek-v4-flash',
    temperature: 0.2,
    maxTokens: 4096,
    fallbackModel: 'google/gemini-2.5-flash',
  },
  [AITask.GENERATE_SUBTASKS]: {
    model: 'deepseek/deepseek-v4-flash',
    temperature: 0.2,
    maxTokens: 3000,
    fallbackModel: 'google/gemini-2.5-flash',
  },
};
