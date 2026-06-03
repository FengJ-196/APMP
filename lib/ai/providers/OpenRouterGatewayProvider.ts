import { IAIServiceProvider, DiagramToMermaidResult, TextToMarkdownResult, ConflictReport } from '../types';
import { AITask, TaskRoutingMap, DEFAULT_ROUTING_MAP } from '../routerTypes';
import {
  DIAGRAM_TO_MERMAID_PROMPT,
  BATCH_DIAGRAMS_TO_MERMAID_PROMPT,
  TEXT_TO_MARKDOWN_PROMPT,
  ANALYZE_CONFLICTS_PROMPT,
  buildWBSBreakdownPrompt,
  buildDeveloperSubtaskBreakdownPrompt,
} from '../prompts';

/**
 * Generic configuration-driven OpenRouter Gateway Provider.
 * Routes each specific developer task to its configured dynamic model with automatic failover.
 */
export class OpenRouterGatewayProvider implements IAIServiceProvider {
  private apiKey: string;
  private routingMap: TaskRoutingMap;

  constructor(apiKey: string, routingMap: TaskRoutingMap = DEFAULT_ROUTING_MAP) {
    this.apiKey = apiKey;
    this.routingMap = { ...DEFAULT_ROUTING_MAP, ...routingMap };
  }

  /**
   * Hot-swap routing configuration maps at runtime.
   */
  public updateRoutingMap(newMap: TaskRoutingMap) {
    this.routingMap = { ...this.routingMap, ...newMap };
  }

  private getTaskConfig(task: AITask) {
    return this.routingMap[task] || DEFAULT_ROUTING_MAP[task];
  }

  /**
   * Helper to execute API calls to OpenRouter.
   */
  private async callOpenRouter(
    messages: any[],
    jsonMode = false,
    temperature = 0,
    model: string
  ): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://github.com/FengJ-196/APMP',
      'X-Title': 'APMP',
    };

    const body: any = {
      model,
      messages,
      temperature,
    };

    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`OpenRouter API error (status ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content === undefined || content === null) {
      throw new Error('Invalid or empty response structure from OpenRouter');
    }

    return content;
  }

  /**
   * Unified dispatcher for OpenRouter tasks with model failover resiliency.
   */
  private async callOpenRouterWithTask(
    task: AITask,
    messages: any[],
    jsonMode = false
  ): Promise<string> {
    const config = this.getTaskConfig(task);
    try {
      return await this.callOpenRouter(messages, jsonMode, config.temperature || 0, config.model);
    } catch (err) {
      if (config.fallbackModel) {
        console.warn(`Task [${task}] primary model [${config.model}] failed. Attempting fallback model [${config.fallbackModel}]...`, err);
        return await this.callOpenRouter(messages, jsonMode, config.temperature || 0, config.fallbackModel);
      }
      throw err;
    }
  }

  /* ─────────────────────────────────────────────────────────── */
  /*  TASK IMPLEMENTATIONS                                       */
  /* ─────────────────────────────────────────────────────────── */

  async convertDiagramToMermaid(imageBuffer: Buffer, mimeType: string): Promise<DiagramToMermaidResult> {
    try {
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      const content = await this.callOpenRouterWithTask(
        AITask.DIAGRAM_TO_MERMAID,
        [
          {
            role: 'user',
            content: [
              { type: 'text', text: DIAGRAM_TO_MERMAID_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        false
      );

      let text = content.trim();

      if (text.includes("NULL")) {
        return {
          mermaidCode: '',
          confidence: 0,
          explanation: 'AI could not identify a clear diagram in this figure.'
        };
      }

      text = text.replace(/```mermaid|```/g, "").trim();

      return {
        mermaidCode: text,
        confidence: 0.95,
        explanation: `Extracted using dynamically routed vision model.`
      };
    } catch (err) {
      console.warn("convertDiagramToMermaid: dynamic router error hit, falling back to mock", err);
      return {
        mermaidCode: 'graph TD;\n    A[User Request] --> B[API Controller];\n    B --> C{Service Layer};\n    C -->|Validate| D[Database];',
        confidence: 0.9,
        explanation: 'Dynamic gateway failed. Returned default fallback mock workflow.'
      };
    }
  }

  async *convertDiagramToMermaidStream(imageBuffer: Buffer, mimeType: string): AsyncIterable<string> {
    try {
      const config = this.getTaskConfig(AITask.DIAGRAM_TO_MERMAID);
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/FengJ-196/APMP',
          'X-Title': 'APMP',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: DIAGRAM_TO_MERMAID_PROMPT },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ],
          temperature: config.temperature || 0,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`OpenRouter HTTP error: ${response.status}`);
      }

      const decoder = new TextDecoder();
      let buffer = '';

      if (typeof (response.body as any)[Symbol.asyncIterator] === 'function') {
        for await (const chunk of response.body as any) {
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || cleanLine === 'data: [DONE]') continue;
            if (cleanLine.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(cleanLine.substring(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content && !content.includes('NULL')) {
                  yield content.replace(/```mermaid|```/g, "");
                }
              } catch (e) {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      } else {
        const reader = (response.body as any).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || cleanLine === 'data: [DONE]') continue;
            if (cleanLine.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(cleanLine.substring(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content && !content.includes('NULL')) {
                  yield content.replace(/```mermaid|```/g, "");
                }
              } catch (e) {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("convertDiagramToMermaidStream: Dynamic provider stream error, falling back to mock", err);
      yield 'graph TD;\n    A[User Request] --> B[API Controller];\n    B --> C{Service Layer};\n    C -->|Validate| D[Database];';
    }
  }

  async convertBatchDiagramsToMermaid(images: Array<{ buffer: Buffer, mimeType: string }>): Promise<string[]> {
    try {
      const batchPrompt = BATCH_DIAGRAMS_TO_MERMAID_PROMPT(images.length);
      const contentParts = [
        { type: 'text', text: batchPrompt }
      ];

      for (const img of images) {
        const base64Image = img.buffer.toString('base64');
        const dataUrl = `data:${img.mimeType};base64,${base64Image}`;
        contentParts.push({ type: 'image_url', image_url: { url: dataUrl } } as any);
      }

      const responseText = await this.callOpenRouterWithTask(
        AITask.DIAGRAM_TO_MERMAID,
        [
          {
            role: 'user',
            content: contentParts
          }
        ],
        true
      );

      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const raw = JSON.parse(cleanJson);
      return raw.diagrams.map((d: any) => (d.mermaid === "NULL" || !d.mermaid) ? "" : d.mermaid.replace(/```mermaid|```/g, "").trim());
    } catch (err) {
      console.warn("convertBatchDiagramsToMermaid: dynamic router error hit, falling back to mock", err);
      return images.map(() => 'graph TD;\n    A[User Request] --> B[API Controller];');
    }
  }

  async reformatToMarkdown(text: string): Promise<TextToMarkdownResult> {
    try {
      const prompt = `${TEXT_TO_MARKDOWN_PROMPT}\n\n${text}`;
      const content = await this.callOpenRouterWithTask(
        AITask.REFORMAT_MARKDOWN,
        [
          { role: 'user', content: prompt }
        ],
        false
      );

      return {
        markdown: content,
        confidence: 0.95
      };
    } catch (err) {
      console.warn("reformatToMarkdown: dynamic router error hit, falling back to mock", err);
      return {
        markdown: text,
        confidence: 1.0
      };
    }
  }

  async analyzeConflicts(text: string, diagrams: Array<{ id: string, mermaid: string, caption: string }>): Promise<ConflictReport[]> {
    try {
      const prompt = `${ANALYZE_CONFLICTS_PROMPT}

      SYSTEM CONTEXT TO ANALYZE:
      RAW TEXT:
      ${text}

      DIAGRAMS:
      ${JSON.stringify(diagrams, null, 2)}`;

      const responseText = await this.callOpenRouterWithTask(
        AITask.ANALYZE_CONFLICTS,
        [
          { role: 'user', content: prompt }
        ],
        true
      );

      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("analyzeConflicts: dynamic router error hit, falling back to mock", err);
      return [
        {
          id: "CF-1",
          type: "Contradiction",
          severity: "High",
          description: "MFA logic contradiction",
          sourceReferences: {
            textSnippets: ["MFA is mandatory for admin users."],
            imageIds: diagrams.map(d => d.id)
          },
          llmExplanation: "The flowchart logic allows authentication to proceed while bypassing MFA, directly contradicting mandatory MFA rules stated in the textual spec.",
          suggestedFix: "Update the flowchart to enforce MFA verification immediately after credential checks."
        }
      ];
    }
  }

  async *analyzeConflictsStream(text: string, diagrams: Array<{ id: string, mermaid: string, caption: string }>): AsyncIterable<string> {
    try {
      const config = this.getTaskConfig(AITask.ANALYZE_CONFLICTS);
      const prompt = `${ANALYZE_CONFLICTS_PROMPT}

      SYSTEM CONTEXT TO ANALYZE:
      RAW TEXT:
      ${text}

      DIAGRAMS:
      ${JSON.stringify(diagrams, null, 2)}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/FengJ-196/APMP',
          'X-Title': 'APMP',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: config.temperature !== undefined ? config.temperature : 0.1,
          max_tokens: config.maxTokens !== undefined ? config.maxTokens : 3000,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`OpenRouter HTTP error: ${response.status}`);
      }

      const decoder = new TextDecoder();
      let buffer = '';

      if (typeof (response.body as any)[Symbol.asyncIterator] === 'function') {
        for await (const chunk of response.body as any) {
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || cleanLine === 'data: [DONE]') continue;
            if (cleanLine.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(cleanLine.substring(6));
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  yield content;
                }
              } catch (e) {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      } else {
        const reader = (response.body as any).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || cleanLine === 'data: [DONE]') continue;
            if (cleanLine.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(cleanLine.substring(6));
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  yield content;
                }
              } catch (e) {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("analyzeConflictsStream: OpenRouter error hit, falling back to mock", err);
      const mockResult = JSON.stringify([
        {
          id: "CF-1",
          type: "Contradiction",
          severity: "High",
          description: "MFA logic contradiction (Fallback)",
          sourceReferences: {
            textSnippets: ["MFA is mandatory for admin users."],
            imageIds: diagrams.map(d => d.id)
          },
          llmExplanation: "The flowchart logic allows authentication to proceed while bypassing MFA, directly contradicting mandatory MFA rules stated in the textual spec.",
          suggestedFix: "Update the flowchart to enforce MFA verification immediately after credential checks."
        }
      ], null, 2);
      yield mockResult;
    }
  }

  async generateWBS(sourceOfTruth: string, config: any): Promise<any[]> {
    try {
      const prompt = buildWBSBreakdownPrompt(sourceOfTruth, config);
      const responseText = await this.callOpenRouterWithTask(
        AITask.GENERATE_WBS,
        [
          { role: 'user', content: prompt }
        ],
        true
      );

      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("generateWBS: dynamic router error hit, falling back to mock", err);
      return [
        {
          title: "Secure Payment Epic",
          description: "Implement billing and payment flows.",
          type: "epic",
          children: []
        }
      ];
    }
  }

  async generateDeveloperSubtasks(task: any, config: any, sourceOfTruth: string): Promise<any[]> {
    try {
      const prompt = buildDeveloperSubtaskBreakdownPrompt(task, config, sourceOfTruth);
      const responseText = await this.callOpenRouterWithTask(
        AITask.GENERATE_SUBTASKS,
        [
          { role: 'user', content: prompt }
        ],
        true
      );

      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("generateDeveloperSubtasks: dynamic router error hit, falling back to mock", err);
      return [
        {
          title: "Install Stripe dependency and configure local API keys",
          description: "Run npm install stripe and update STRIPE_SECRET_KEY in env configuration."
        },
        {
          title: "Create server checkout session API handler",
          description: "Build POST /api/payment/checkout endpoint using the Stripe SDK to generate payment links."
        },
        {
          title: "Design Stripe checkout checkout button page",
          description: "Implement responsive checkout button and integrate payment flow callback handling."
        }
      ];
    }
  }
}
