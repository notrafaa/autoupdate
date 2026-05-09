import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getStoredConfigs, isCloudStatus, logAdminAction, saveStoredConfigs } from '@/lib/cloud';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const { status } = await request.json();

  if (!id || !isCloudStatus(status) || status === 'pending') {
    return NextResponse.json({ error: 'Config id and approved/rejected status are required' }, { status: 400 });
  }

  const configs = await getStoredConfigs();
  const config = configs.find((item) => item.id === id);

  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

  const nextConfigs = configs.map((item) =>
    item.id === id ? { ...item, status, updated_at: new Date().toISOString() } : item,
  );

  await saveStoredConfigs(nextConfigs);
  await logAdminAction(`config_${status}`, 'config', config.id, config.name);
  return NextResponse.json({ success: true });
}
