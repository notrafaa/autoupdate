import { getAppConfig } from '@/lib/storage';
import { NextResponse } from 'next/server';

export async function GET() {
  const config = await getAppConfig();
  
  if (!config.downloadUrl) {
    return new NextResponse('No download available', { status: 404 });
  }

  return NextResponse.redirect(config.downloadUrl);
}
