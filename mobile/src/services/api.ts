import Constants from 'expo-constants';

function getBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  return fromExtra || 'http://10.0.2.2:4000';
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request to ${path} failed with ${response.status}`);
    (error as any).code = data.error;
    (error as any).details = data.details;
    (error as any).status = response.status;
    throw error;
  }
  return data as T;
}

export interface AnalyzePhotoInput {
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  photoType: 'full' | 'closeup' | 'side' | 'fracture' | 'crystal_detail';
}

export async function analyzeSpecimen(sampleCode: string, photos: AnalyzePhotoInput[], language: 'fr' | 'en' | 'ar') {
  return postJson('/api/analyze', { sampleCode, photos, language });
}

export async function refineIdentification(
  candidates: { name: string; category?: string; confidence: number }[],
  measurements: {
    densityGCm3?: number | null;
    hardnessMin?: number | null;
    hardnessMax?: number | null;
    magnetism?: string | null;
    acidReaction?: string | null;
    uvFluorescence?: string | null;
  }
) {
  return postJson('/api/identify', { candidates, measurements });
}

export async function getValuation(payload: {
  materialType: string;
  weightGrams: number;
  quality: string;
  dimensions?: string;
  condition?: string;
  color?: string;
  transparency?: string;
  crystalQuality?: string;
  origin?: string;
  rarity?: string;
  treatment?: string;
  certification?: string;
  marketCategory?: string;
  currency?: 'MAD' | 'USD' | 'EUR';
  manualMarketEntries?: unknown[];
}) {
  return postJson('/api/valuation', payload);
}

export async function searchReferenceOnline(query: string, category?: string) {
  return postJson('/api/reference-search', { query, category });
}

export async function checkBackendHealth() {
  const response = await fetch(`${getBaseUrl()}/api/health`);
  return response.json();
}
