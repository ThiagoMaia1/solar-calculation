import { describe, it, expect } from 'vitest';
import { formatCellValue, type CellFormat } from './EditableCell';

// ──────────────────────────────────────────────
// formatCellValue
// ──────────────────────────────────────────────
describe('formatCellValue', () => {
  it('returns dash for null', () => {
    expect(formatCellValue(null, 'brl')).toBe('—');
  });

  it('returns dash for undefined', () => {
    expect(formatCellValue(undefined, 'brl')).toBe('—');
  });

  // ── brl format ──
  describe('brl format', () => {
    it('formats positive value', () => {
      const result = formatCellValue(1234.56, 'brl');
      expect(result).toContain('R$');
      expect(result).toContain('1.234,56');
    });

    it('formats zero', () => {
      const result = formatCellValue(0, 'brl');
      expect(result).toContain('R$');
      expect(result).toContain('0,00');
    });

    it('formats negative value', () => {
      const result = formatCellValue(-50, 'brl');
      expect(result).toContain('50,00');
    });
  });

  // ── kwh format ──
  describe('kwh format', () => {
    it('formats value with kWh suffix', () => {
      expect(formatCellValue(500, 'kwh')).toBe('500 kWh');
    });

    it('formats zero kWh', () => {
      expect(formatCellValue(0, 'kwh')).toBe('0 kWh');
    });

    it('formats large kWh with thousands separator', () => {
      expect(formatCellValue(1500, 'kwh')).toBe('1.500 kWh');
    });

    it('rounds kWh to 0 decimal places', () => {
      // formatNumber with decimals=0 rounds
      expect(formatCellValue(123.7, 'kwh')).toBe('124 kWh');
    });
  });

  // ── currency4 format ──
  describe('currency4 format', () => {
    it('formats with R$ prefix and 4 decimals', () => {
      expect(formatCellValue(0.75, 'currency4')).toBe('R$ 0,7500');
    });

    it('formats value with full precision', () => {
      expect(formatCellValue(1.2345, 'currency4')).toBe('R$ 1,2345');
    });

    it('pads to 4 decimals', () => {
      expect(formatCellValue(1, 'currency4')).toBe('R$ 1,0000');
    });
  });

  // ── number (default) format ──
  describe('number format', () => {
    it('formats with 2 decimal places', () => {
      expect(formatCellValue(42, 'number')).toBe('42,00');
    });

    it('formats fractional value', () => {
      expect(formatCellValue(3.14, 'number')).toBe('3,14');
    });

    it('formats large number with thousands separator', () => {
      expect(formatCellValue(10000, 'number')).toBe('10.000,00');
    });
  });

  // ── edge cases ──
  it('returns dash for null regardless of format', () => {
    const formats: CellFormat[] = ['brl', 'kwh', 'currency4', 'number'];
    for (const fmt of formats) {
      expect(formatCellValue(null, fmt)).toBe('—');
    }
  });
});
