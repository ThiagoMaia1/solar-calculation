import type { AppData } from '../types';

const BIN_ID = import.meta.env.VITE_JSONBIN_BIN_ID as string;
const API_KEY = import.meta.env.VITE_JSONBIN_API_KEY as string;
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

function getHeaders(contentType = false): HeadersInit {
  const h: Record<string, string> = { 'X-Master-Key': API_KEY };
  if (contentType) h['Content-Type'] = 'application/json';
  return h;
}

export async function fetchData(): Promise<AppData> {
  const res = await fetch(`${BASE_URL}/latest`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Falha ao carregar dados');
  const json = await res.json();
  return json.record as AppData;
}

export async function saveAllData(data: AppData): Promise<{ success: boolean }> {
  const res = await fetch(BASE_URL, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao salvar dados');
  return { success: true };
}
