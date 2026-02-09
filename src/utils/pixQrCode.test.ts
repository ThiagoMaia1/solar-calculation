import { describe, it, expect } from 'vitest';
import { buildPixPayload, generatePixQrCodePng } from './pixQrCode';

// ──────────────────────────────────────────────
// buildPixPayload
// ──────────────────────────────────────────────
describe('buildPixPayload', () => {
  const defaultParams = {
    pixKey: '12345678900',
    merchantName: 'Thiago Maia',
    merchantCity: 'Fortaleza',
    amount: 160.50,
  };

  it('starts with Payload Format Indicator 000201', () => {
    const payload = buildPixPayload(defaultParams);
    expect(payload.startsWith('000201')).toBe(true);
  });

  it('contains the PIX key', () => {
    const payload = buildPixPayload(defaultParams);
    expect(payload).toContain('12345678900');
  });

  it('contains the br.gov.bcb.pix GUI', () => {
    const payload = buildPixPayload(defaultParams);
    expect(payload).toContain('br.gov.bcb.pix');
  });

  it('contains BRL currency code 986', () => {
    const payload = buildPixPayload(defaultParams);
    expect(payload).toContain('5303986');
  });

  it('contains the transaction amount formatted to 2 decimals', () => {
    const payload = buildPixPayload(defaultParams);
    expect(payload).toContain('160.50');
  });

  it('contains country code BR', () => {
    const payload = buildPixPayload(defaultParams);
    expect(payload).toContain('5802BR');
  });

  it('contains merchant name', () => {
    const payload = buildPixPayload(defaultParams);
    expect(payload).toContain('Thiago Maia');
  });

  it('contains merchant city', () => {
    const payload = buildPixPayload(defaultParams);
    expect(payload).toContain('Fortaleza');
  });

  it('ends with CRC16 (6304 + 4 hex chars)', () => {
    const payload = buildPixPayload(defaultParams);
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it('uses default txId when not specified', () => {
    const payload = buildPixPayload(defaultParams);
    // Default txId is '***', so additional data should contain it
    expect(payload).toContain('***');
  });

  it('uses custom txId when provided', () => {
    const payload = buildPixPayload({ ...defaultParams, txId: 'FATURA001' });
    expect(payload).toContain('FATURA001');
  });

  it('strips accents from merchant name', () => {
    const payload = buildPixPayload({
      ...defaultParams,
      merchantName: 'José André',
    });
    // Should contain normalized version without accents
    expect(payload).toContain('Jose Andre');
    expect(payload).not.toContain('é');
    expect(payload).not.toContain('é');
  });

  it('strips accents from merchant city', () => {
    const payload = buildPixPayload({
      ...defaultParams,
      merchantCity: 'São Paulo',
    });
    expect(payload).toContain('Sao Paulo');
  });

  it('truncates merchant name to 25 chars', () => {
    const longName = 'A'.repeat(30);
    const payload = buildPixPayload({ ...defaultParams, merchantName: longName });
    // The TLV for merchant name (ID 59) should have length 25
    expect(payload).toContain('5925' + 'A'.repeat(25));
  });

  it('truncates merchant city to 15 chars', () => {
    const longCity = 'B'.repeat(20);
    const payload = buildPixPayload({ ...defaultParams, merchantCity: longCity });
    // The TLV for merchant city (ID 60) should have length 15
    expect(payload).toContain('6015' + 'B'.repeat(15));
  });

  it('formats amount with 2 decimal places', () => {
    const payload = buildPixPayload({ ...defaultParams, amount: 100 });
    expect(payload).toContain('100.00');
  });

  it('produces consistent output for the same inputs', () => {
    const p1 = buildPixPayload(defaultParams);
    const p2 = buildPixPayload(defaultParams);
    expect(p1).toBe(p2);
  });

  it('produces different CRCs for different amounts', () => {
    const p1 = buildPixPayload({ ...defaultParams, amount: 100 });
    const p2 = buildPixPayload({ ...defaultParams, amount: 200 });
    // Last 4 chars are the CRC
    expect(p1.slice(-4)).not.toBe(p2.slice(-4));
  });
});

// ──────────────────────────────────────────────
// generatePixQrCodePng
// ──────────────────────────────────────────────
describe('generatePixQrCodePng', () => {
  it('returns a Uint8Array with PNG data', async () => {
    const bytes = await generatePixQrCodePng({
      pixKey: '12345678900',
      merchantName: 'Thiago',
      merchantCity: 'Fortaleza',
      amount: 100,
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('PNG starts with valid PNG signature', async () => {
    const bytes = await generatePixQrCodePng({
      pixKey: '12345678900',
      merchantName: 'Test',
      merchantCity: 'City',
      amount: 50,
    });

    // PNG magic bytes: 137 80 78 71 13 10 26 10
    expect(bytes[0]).toBe(137);
    expect(bytes[1]).toBe(80); // P
    expect(bytes[2]).toBe(78); // N
    expect(bytes[3]).toBe(71); // G
  });
});
