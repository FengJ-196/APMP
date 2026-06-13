import { NextResponse } from 'next/server';
import { UserService } from '@/lib/services/UserService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const response = await UserService.register(email, password);
    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    const status = message === 'User already exists' ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
