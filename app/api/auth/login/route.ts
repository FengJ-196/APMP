import { NextResponse } from 'next/server';
import { UserService } from '@/lib/services/UserService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const response = await UserService.login(email, password);
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    const status = message === 'Invalid email or password' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
