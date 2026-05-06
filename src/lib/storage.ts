import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface AppConfig {
  version: string;
  downloadUrl: string;
  updatedAt: string;
}

const BUCKET_NAME = 'releases';

export async function getAppConfig(): Promise<AppConfig> {
  try {
    // Try to get from a JSON file in storage for simplicity (like before)
    // or you could use a database table. Let's stick to storage for now 
    // to avoid requiring the user to create a table.
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .download('config.json');

    if (error || !data) {
      return { version: '0.0.0', downloadUrl: '', updatedAt: new Date().toISOString() };
    }

    const text = await data.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Error fetching config:', error);
    return { version: '0.0.0', downloadUrl: '', updatedAt: new Date().toISOString() };
  }
}

export async function updateAppConfig(config: AppConfig) {
  const { error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload('config.json', JSON.stringify(config), {
      contentType: 'application/json',
      upsert: true
    });

  if (error) throw error;
}

export async function uploadFile(file: File, version: string): Promise<string> {
  const fileName = `update_${version}.exe`;
  const { data, error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      upsert: true
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase
    .storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return publicUrl;
}
