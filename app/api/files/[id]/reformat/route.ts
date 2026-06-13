import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/FileService';
import { AIService } from '@/lib/ai';
import { AITask } from '@/lib/ai/routerTypes';
import { TEXT_TO_MARKDOWN_PROMPT } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const file = await FileService.getFileById(id);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Capture file content
    let content = file.content || '';

    // Robust base64 binary loading logic if content is missing
    if (!content && file.fileData) {
      const fileData: any = file.fileData;
      let buffer: Buffer;

      if (Buffer.isBuffer(fileData)) {
        buffer = fileData;
      } else if (fileData && fileData.buffer) {
        buffer = Buffer.from(fileData.buffer);
      } else if (fileData && fileData.data) {
        buffer = Buffer.from(fileData.data);
      } else if (typeof fileData === 'string') {
        const base64Str = fileData.includes(';base64,')
          ? fileData.split(';base64,')[1]
          : fileData;
        buffer = Buffer.from(base64Str, 'base64');
      } else {
        buffer = Buffer.from('');
      }

      content = buffer.toString('utf-8').trim();
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Document contains no text content to reformat.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    // Resolve model mapping configuration dynamically
    const globalForRouting = global as unknown as {
      activeRoutingMap?: Record<string, { model: string; temperature?: number; maxTokens?: number }>;
    };
    
    const taskConfig = globalForRouting.activeRoutingMap?.[AITask.REFORMAT_MARKDOWN] || {
      model: 'deepseek/deepseek-v4-flash',
      temperature: 0.2,
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/FengJ-196/APMP',
        'X-Title': 'APMP Gateway',
      },
      body: JSON.stringify({
        model: taskConfig.model,
        messages: [
          {
            role: 'user',
            content: `${TEXT_TO_MARKDOWN_PROMPT}\n\nDOCUMENT TO FORMAT:\n${content}`
          }
        ],
        temperature: taskConfig.temperature !== undefined ? taskConfig.temperature : 0.2,
        max_tokens: taskConfig.maxTokens !== undefined ? taskConfig.maxTokens : 65536,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => '');
      return NextResponse.json(
        { error: `OpenRouter stream error (${response.status}): ${errText}` },
        { status: response.status }
      );
    }

    const openRouterStream = response.body;
    const reader = openRouterStream.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    let fullMarkdownText = '';
    let buffer = '';

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Persist formatted content in database on completion of the stream
              if (fullMarkdownText.trim()) {
                await FileService.updateFileTextContent(id, fullMarkdownText.trim());
              }
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const cleanLine = line.trim();
              if (!cleanLine || cleanLine === 'data: [DONE]') continue;

              if (cleanLine.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(cleanLine.substring(6));
                  const token = parsed.choices?.[0]?.delta?.content || '';
                  if (token) {
                    fullMarkdownText += token;
                    controller.enqueue(encoder.encode(token));
                  }
                } catch (e) {
                  // Buffer chunk partial JSON - wait for more chunks
                }
              }
            }
          }
        } catch (err) {
          console.error('Error streaming reformat chunks:', err);
          controller.error(err);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('File reformat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
