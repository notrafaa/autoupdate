import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getStoredConfigs, logAdminAction, saveStoredConfigs } from '@/lib/cloud';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Config id is required' }, { status: 400 });

  const configs = await getStoredConfigs();
  const config = configs.find((item) => item.id === id);

  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

  await saveStoredConfigs(configs.filter((item) => item.id !== id));
  await logAdminAction('config_deleted', 'config', config.id, config.name);
  return NextResponse.json({ success: true });
}
