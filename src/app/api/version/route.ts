import { getAppConfig } from '@/lib/storage';
import { NextResponse } from 'next/server';

export async function GET() {
  const config = await getAppConfig();
  // On renvoie tout l'objet config pour que le loader C++ ait accès aux fichiers additionnels, à l'icône, etc.
  return NextResponse.json(config);
}
