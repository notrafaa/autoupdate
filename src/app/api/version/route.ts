import { getAppConfig } from '@/lib/storage';
import { NextResponse } from 'next/server';

export async function GET() {
  const config = await getAppConfig();
  return new NextResponse(config.version, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
