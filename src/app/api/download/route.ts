import { getAppConfig } from '@/lib/storage';
import { NextResponse } from 'next/server';

export async function GET() {
  const config = await getAppConfig();
  
  if (!config.mainFileUrl) {
    return new NextResponse('Aucun téléchargement disponible', { status: 404 });
  }

  // Redirige vers le fichier principal (.all)
  return NextResponse.redirect(config.mainFileUrl);
}
