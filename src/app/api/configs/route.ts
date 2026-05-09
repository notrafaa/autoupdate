import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getStoredConfigs, isCloudStatus, isHexColor, normalizeThemePayload, saveStoredConfigs } from '@/lib/cloud';

const ICONS = ['file', 'star', 'bolt', 'shield', 'cloud'];

export async function GET() {
  const configs = await getStoredConfigs();
  return NextResponse.json({
    success: true,
    configs: configs.filter((config) => config.status === 'approved'),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const author = typeof body.author === 'string' && body.author.trim() ? body.author.trim() : 'Anonymous';
    const icon = ICONS.includes(body.icon) ? body.icon : 'file';
    const color = isHexColor(body.color) ? body.color : null;
    const theme = normalizeThemePayload(body.theme);
    const payload = typeof body.payload === 'string' ? body.payload : '';
    const status = isCloudStatus(body.status) ? body.status : 'pending';

    if (!name || !color || !theme || !payload) {
      return NextResponse.json(
        { success: false, error: 'Config name, color, theme and payload are required.' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const config = {
      id: randomUUID(),
      name,
      author,
      icon,
      color,
      theme,
      payload,
      status,
      created_at: now,
      updated_at: now,
    };

    const configs = await getStoredConfigs();
    await saveStoredConfigs([config, ...configs]);

    return NextResponse.json({ success: true, config }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }
}
