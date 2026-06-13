import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { model, messages, temperature, max_tokens, stream, ...extraParams } = body;

    if (!model || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Missing required parameters: model and messages (array).' },
        { status: 400 }
      );
    }

    const payload = {
      model,
      messages,
      temperature: temperature !== undefined ? temperature : 0.7,
      max_tokens: max_tokens !== undefined ? max_tokens : 1000,
      stream: !!stream,
      ...extraParams,
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/FengJ-196/APMP',
        'X-Title': 'APMP Gateway',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return NextResponse.json(
        { error: `OpenRouter error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    // Handle Streaming response
    if (payload.stream) {
      if (!response.body) {
        return NextResponse.json(
          { error: 'OpenRouter stream response body is null' },
          { status: 500 }
        );
      }

      const openRouterStream = response.body;
      const reader = openRouterStream.getReader();
      const encoder = new TextEncoder();

      const customStream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
                break;
              }
              controller.enqueue(value);
            }
          } catch (err) {
            console.error('Error streaming chunks:', err);
            controller.error(err);
          }
        },
      });

      return new NextResponse(customStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle Non-streaming response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('OpenRouter Chat Gateway Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
