import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { updateAppConfig } from '@/lib/storage';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { version, versionName, mainFileUrl, iconUrl, additionalFiles } = data;

    if (!version || !versionName) {
      return NextResponse.json({ error: 'La version et le nom sont requis' }, { status: 400 });
    }

    const config = {
      version,
      versionName,
      mainFileUrl: mainFileUrl || '',
      iconUrl: iconUrl || '',
      additionalFiles: additionalFiles || [],
      updatedAt: new Date().toISOString(),
    };

    // If some URLs are missing, fetch current ones to prevent overwriting with empty
    if (!mainFileUrl || !iconUrl) {
      const { getAppConfig } = await import('@/lib/storage');
      const current = await getAppConfig();
      if (!mainFileUrl) config.mainFileUrl = current.mainFileUrl;
      if (!iconUrl) config.iconUrl = current.iconUrl;
    }

    await updateAppConfig(config);

    return NextResponse.json({ success: true, version });
  } catch (error: any) {
    console.error('Publish API error:', error);
    return NextResponse.json({ error: error.message || 'Échec de la publication' }, { status: 500 });
  }
}
