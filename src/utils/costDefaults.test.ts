import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COST_DEFAULTS,
  ensureCostDefaults,
  getDefaultCostsForMonthKey,
} from './costDefaults';
import type { Settings } from '../types';

const baseSettings: Settings = {
  startDate: '2024-01',
};

describe('costDefaults', () => {
  it('returns April cleaning and zero impostos defaults', () => {
    const costs = getDefaultCostsForMonthKey('2025-04', baseSettings);
    expect(costs.limpeza).toBe(409.6);
    expect(costs.impostos).toBe(0);
    expect(costs.internet).toBe(89.9);
  });

  it('returns zero costs for June', () => {
    const costs = getDefaultCostsForMonthKey('2025-06', baseSettings);
    expect(costs).toEqual(DEFAULT_COST_DEFAULTS['06']);
  });

  it('uses custom settings overrides when present', () => {
    const settings: Settings = {
      ...baseSettings,
      costDefaults: {
        ...DEFAULT_COST_DEFAULTS,
        '03': {
          internet: 50,
          seguro: 0,
          iluminacaoPublica: 0,
          vigilante: 0,
          limpeza: 0,
          impostos: 0,
        },
      },
    };
    expect(getDefaultCostsForMonthKey('2024-03', settings).internet).toBe(50);
  });

  it('fills missing costDefaults on ensureCostDefaults', () => {
    const ensured = ensureCostDefaults(baseSettings);
    expect(ensured.costDefaults?.['05']?.limpeza).toBe(409.6);
  });
});
