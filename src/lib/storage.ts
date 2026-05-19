import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface ReleaseFile {
  name: string;
  url: string;
}
export interface AppConfig {
  version: string;
  versionName: string;
  mainFileUrl: string;
  driverFileUrl?: string;
  iconUrl?: string;
  logoUrl?: string;
  watermarkUrl?: string;
  additionalFiles: ReleaseFile[];
  updatedAt: string;
  changelog?: string;
}
const BUCKET_NAME = 'releases';

export async function getAppConfig(): Promise<AppConfig> {
  try {
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .download('config.json');

    if (error || !data) {
      return { 
        version: '1.0.0', 
        versionName: 'Version Initiale',
        mainFileUrl: '', 
        additionalFiles: [],
        updatedAt: new Date().toISOString() 
      };
    }

    const text = await data.text();
    return JSON.parse(text);
  } catch {
    return { 
      version: '1.0.0', 
      versionName: 'Version Initiale',
      mainFileUrl: '', 
      additionalFiles: [],
      updatedAt: new Date().toISOString() 
    };
  }
}

export async function updateAppConfig(config: AppConfig) {
  // Update current config
  const { error: configError } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload('config.json', JSON.stringify(config), {
      contentType: 'application/json',
      upsert: true
    });

  if (configError) throw configError;

  // Add to history
  const historyPath = `history/version_${config.version.replace(/\./g, '_')}.json`;
  await supabase
    .storage
    .from(BUCKET_NAME)
    .upload(historyPath, JSON.stringify(config), {
      contentType: 'application/json',
      upsert: true
    });

  // Cleanup old heavy files (except the current version's folder)
  await cleanupOldReleases(config.mainFileUrl);
}

async function cleanupOldReleases(currentFileUrl: string) {
  try {
    // Identify the current version folder
    // URL looks like: .../releases/v_1_0_2_timestamp/file.all
    const urlParts = currentFileUrl.split('/');
    const currentFolder = urlParts[urlParts.length - 2];

    const { data: folders, error } = await supabase.storage.from(BUCKET_NAME).list();
    if (error || !folders) return;

    const foldersToDelete = folders
      .filter(f => f.name.startsWith('v_') && f.name !== currentFolder)
      .map(f => f.name);

    for (const folder of foldersToDelete) {
      // List files in the folder to delete them
      const { data: files } = await supabase.storage.from(BUCKET_NAME).list(folder);
      if (files) {
        const filesToDel = files.map(f => `${folder}/${f.name}`);
        await supabase.storage.from(BUCKET_NAME).remove(filesToDel);
      }
    }
  } catch (e) {
    console.error('Cleanup failed:', e);
  }
}

export async function getHistory(): Promise<AppConfig[]> {
  try {
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .list('history');

    if (error || !data) return [];

    const history = await Promise.all(
      data
        .filter(f => f.name.endsWith('.json'))
        .map(async (f) => {
          const { data: fileData } = await supabase.storage.from(BUCKET_NAME).download(`history/${f.name}`);
          if (fileData) {
            return JSON.parse(await fileData.text());
          }
          return null;
        })
    );

    return history.filter(h => h !== null).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}
