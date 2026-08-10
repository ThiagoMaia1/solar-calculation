import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchData, saveAllData } from './api';
import type { AppData } from '../types';

// ── Mock fetch globally ──

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

// ── Helpers ──

function jsonResponse(data: unknown, ok = true) {
  return {
    ok,
    json: () => Promise.resolve(data),
  };
}

const sampleAppData: AppData = {
  equipment: {
    inversor: { value: 12000, lifespanYears: 10 },
    placas: { value: 36000, lifespanYears: 25 },
  },
  settings: { startDate: '2024-01' },
  members: [{ id: 'pai', name: 'Pai', address: 'Rua A' }],
  months: {},
};

// ──────────────────────────────────────────────
// fetchData
// ──────────────────────────────────────────────
describe('fetchData', () => {
  it('fetches and returns app data from JSONBin record', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ record: sampleAppData, metadata: {} }),
    );

    const data = await fetchData();
    expect(data).toEqual(sampleAppData);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/latest');
    expect(opts.headers).toHaveProperty('X-Master-Key');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(null, false));

    await expect(fetchData()).rejects.toThrow('Falha ao carregar dados');
  });

  it('does not send Content-Type header on GET', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ record: sampleAppData }),
    );

    await fetchData();

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers).not.toHaveProperty('Content-Type');
  });

  it('throws when fetch itself rejects (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchData()).rejects.toThrow('Network error');
  });
});

// ──────────────────────────────────────────────
// saveAllData
// ──────────────────────────────────────────────
describe('saveAllData', () => {
  it('sends PUT request with full data', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ record: sampleAppData }));

    const result = await saveAllData(sampleAppData);
    expect(result).toEqual({ success: true });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe('PUT');
    expect(opts.headers).toHaveProperty('X-Master-Key');
    expect(JSON.parse(opts.body)).toEqual(sampleAppData);
  });

  it('sends Content-Type application/json header on PUT', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ record: sampleAppData }));

    await saveAllData(sampleAppData);

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  it('uses base URL without /latest for PUT', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ record: sampleAppData }));

    await saveAllData(sampleAppData);

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain('/latest');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(null, false));

    await expect(saveAllData(sampleAppData)).rejects.toThrow(
      'Falha ao salvar dados',
    );
  });

  it('throws when fetch itself rejects (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(saveAllData(sampleAppData)).rejects.toThrow(
      'Connection refused',
    );
  });
});
