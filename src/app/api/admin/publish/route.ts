import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getAppConfig, updateAppConfig } from '@/lib/storage';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { version, versionName, mainFileUrl, driverFileUrl, iconUrl, logoUrl, watermarkUrl, additionalFiles } = data;

    if (!version || !versionName) {
      return NextResponse.json({ error: 'La version et le nom sont requis' }, { status: 400 });
    }

    const current = await getAppConfig();
    const config = {
      version,
      versionName,
      mainFileUrl: mainFileUrl || current.mainFileUrl || '',
      driverFileUrl: driverFileUrl || current.driverFileUrl || '',
      iconUrl: iconUrl || current.iconUrl || '',
      logoUrl: logoUrl || current.logoUrl || '',
      watermarkUrl: watermarkUrl || current.watermarkUrl || '',
      additionalFiles: additionalFiles || [],
      updatedAt: new Date().toISOString(),
    };

    await updateAppConfig(config);
    return NextResponse.json({ success: true, version });
  } catch (error: unknown) {
    console.error('Publish API error:', error);
    const message = error instanceof Error ? error.message : 'Echec de la publication';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

