import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { updateAppConfig } from '@/lib/storage';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const version = formData.get('version') as string;

  if (!version) {
    return NextResponse.json({ error: 'Version is required' }, { status: 400 });
  }

  let downloadUrl = formData.get('existingDownloadUrl') as string || '';

  if (file && file.size > 0) {
    // Upload new file
    const blob = await put(`releases/update_${version}.exe`, file, {
      access: 'public',
      addRandomSuffix: true,
    });
    downloadUrl = blob.url;
  }

  if (!downloadUrl) {
    return NextResponse.json({ error: 'No file provided and no existing URL' }, { status: 400 });
  }

  // Update config
  await updateAppConfig({
    version,
    downloadUrl,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, version, downloadUrl });
}
