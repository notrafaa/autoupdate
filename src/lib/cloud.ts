import { randomUUID } from 'crypto';
import { supabase } from '@/lib/storage';

const BUCKET_NAME = 'releases';
const CONFIGS_PATH = 'cloud/configs.json';
const ACTIONS_PATH = 'cloud/admin_actions.json';

export const CLOUD_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type CloudStatus = (typeof CLOUD_STATUSES)[number];

export type ThemePayload = {
  primary: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  rounding: number;
  childRounding: number;
};

export type CloudConfigRecord = {
  id: string;
  name: string;
  author: string;
  icon: string;
  color: string;
  theme: ThemePayload;
  payload: string;
  status: CloudStatus;
  created_at: string;
  updated_at: string;
};

export type AdminActionRecord = {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  target_name: string | null;
  created_at: string;
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function isCloudStatus(status: unknown): status is CloudStatus {
  return typeof status === 'string' && CLOUD_STATUSES.includes(status as CloudStatus);
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

export function normalizeThemePayload(payload: unknown): ThemePayload | null {
  if (!payload || typeof payload !== 'object') return null;

  const source = payload as Record<string, unknown>;
  const colors = ['primary', 'background', 'surface', 'border', 'text', 'textDim', 'accent'] as const;

  for (const color of colors) {
    if (!isHexColor(source[color])) return null;
  }

  const rounding = Number(source.rounding);
  const childRounding = Number(source.childRounding);

  if (!Number.isFinite(rounding) || !Number.isFinite(childRounding)) return null;

  return {
    primary: String(source.primary),
    background: String(source.background),
    surface: String(source.surface),
    border: String(source.border),
    text: String(source.text),
    textDim: String(source.textDim),
    accent: String(source.accent),
    rounding,
    childRounding,
  };
}

export async function logAdminAction(action: string, targetType: string, targetId: string, targetName?: string) {
  const item: AdminActionRecord = {
    id: randomUUID(),
    action,
    target_type: targetType,
    target_id: targetId,
    target_name: targetName ?? null,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('admin_actions').insert(item);
  if (error) {
    const actions = await getStoredAdminActions();
    await saveStoredAdminActions([item, ...actions].slice(0, 50));
  }
}

async function readStorageJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);
    if (error || !data) return fallback;
    return JSON.parse(await data.text()) as T;
  } catch {
    return fallback;
  }
}

async function writeStorageJson(path: string, value: unknown) {
  await supabase.storage.from(BUCKET_NAME).upload(path, JSON.stringify(value), {
    contentType: 'application/json',
    upsert: true,
  });
}

export async function getStoredConfigs() {
  return readStorageJson<CloudConfigRecord[]>(CONFIGS_PATH, []);
}

export async function saveStoredConfigs(configs: CloudConfigRecord[]) {
  await writeStorageJson(CONFIGS_PATH, configs);
}

export async function getStoredAdminActions() {
  return readStorageJson<AdminActionRecord[]>(ACTIONS_PATH, []);
}

async function saveStoredAdminActions(actions: AdminActionRecord[]) {
  await writeStorageJson(ACTIONS_PATH, actions);
}
