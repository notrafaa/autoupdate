import { list, put } from '@vercel/blob';

export interface AppConfig {
  version: string;
  downloadUrl: string;
  updatedAt: string;
}

const CONFIG_FILENAME = 'app_config.json';

export async function getAppConfig(): Promise<AppConfig> {
  try {
    const { blobs } = await list({ prefix: CONFIG_FILENAME });
    if (blobs.length === 0) {
      return { version: '0.0.0', downloadUrl: '', updatedAt: new Date().toISOString() };
    }
    
    const response = await fetch(blobs[0].url);
    return await response.json();
  } catch (error) {
    console.error('Error fetching config:', error);
    return { version: '0.0.0', downloadUrl: '', updatedAt: new Date().toISOString() };
  }
}

export async function updateAppConfig(config: AppConfig) {
  await put(CONFIG_FILENAME, JSON.stringify(config), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false, // We want to overwrite or at least find it easily
  });
}
