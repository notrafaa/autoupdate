import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { updateAppConfig } from '@/lib/storage';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { version, downloadUrl } = await request.json();

    if (!version) {
      return NextResponse.json({ error: 'Version is required' }, { status: 400 });
    }

    // We don't need to upload the file here anymore, the client already did it.
    // If downloadUrl is empty, it means we only updated the version number (not recommended but possible).
    
    const config = {
      version,
      downloadUrl: downloadUrl || '', // Keep existing if not provided? 
      updatedAt: new Date().toISOString(),
    };

    // If downloadUrl is empty, try to get existing one from current config
    if (!downloadUrl) {
      const { getAppConfig } = await import('@/lib/storage');
      const current = await getAppConfig();
      config.downloadUrl = current.downloadUrl;
    }

    await updateAppConfig(config);

    return NextResponse.json({ success: true, version, downloadUrl: config.downloadUrl });
  } catch (error: any) {
    console.error('Publish API error:', error);
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}
