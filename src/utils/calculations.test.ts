import { describe, it, expect } from 'vitest';
import {
  getMonthIndex,
  getMonthlyDepreciation,
  getEquipmentWithDepreciation,
  calculateMemberResults,
  calculateMonthlyCosts,
  calculateTotalCosts,
  calculateMonthGains,
  computeMonthValues,
  resolveMonthPricing,
  resolveEnelBaseCostPerKwh,
  getEnelBillBreakdown,
  migrateEnelBaseCost,
  migrateMonthDiscounts,
  formatBRL,
  formatNumber,
  formatMonthLabel,
  getNextMonthKey,
} from './calculations';
import type {
  Equipment,
  MonthData,
  Member,
  AppData,
  MemberCredits,
  ComputedCosts,
} from '../types';

// ── Fixtures ──

const equipment: Equipment = {
  inversor: { value: 12000, lifespanYears: 10 },
  placas: { value: 36000, lifespanYears: 25 },
};

const members: Member[] = [
  { id: 'pai', name: 'Pai', address: 'Rua A' },
  { id: 'mae', name: 'Mae', address: 'Rua B' },
];

function makeMonthData(overrides: Partial<MonthData> = {}): MonthData {
  return {
    discountPerKwh: 0.30,
    enelBaseCostPerKwh: 1.05,
    costs: {
      internet: 100,
      seguro: 50,
      iluminacaoPublica: 30,
      vigilante: 20,
      limpeza: 15,
      trocaTitularidade: 10,
      impostos: 25,
      taxasEconomy: 5,
    },
    credits: {
      pai: { consumo: 200, taxas: 10 },
      mae: { consumo: 150, taxas: 8 },
    },
    thiagoConsumo: 300,
    creditosCompensar: 100,
    economyEnergy: 50,
    ...overrides,
  };
}

function makeAppData(monthsMap: Record<string, MonthData> = {}): AppData {
  return {
    equipment,
    settings: { startDate: '2024-01', distributionFeePerKwh: 0 },
    members,
    months: monthsMap,
  };
}

const defaultPricing = {
  discountPerKwh: 0.30,
  chargedRatePerKwh: 0.75,
  profitPerKwh: 0.75,
};

// ──────────────────────────────────────────────
// getMonthIndex
// ──────────────────────────────────────────────
describe('getMonthIndex', () => {
  it('returns 1 for the start month itself', () => {
    expect(getMonthIndex('2024-01', '2024-01')).toBe(1);
  });

  it('returns correct index within the same year', () => {
    expect(getMonthIndex('2024-06', '2024-01')).toBe(6);
  });

  it('handles year crossing', () => {
    expect(getMonthIndex('2025-03', '2024-01')).toBe(15);
  });

  it('works with December to January transition', () => {
    expect(getMonthIndex('2025-01', '2024-12')).toBe(2);
  });

  it('handles multi-year span', () => {
    // 3 years = 36 months offset + 1
    expect(getMonthIndex('2027-01', '2024-01')).toBe(37);
  });

  it('handles same year, adjacent months', () => {
    expect(getMonthIndex('2024-02', '2024-01')).toBe(2);
  });

  it('returns correct value for end of year', () => {
    expect(getMonthIndex('2024-12', '2024-01')).toBe(12);
  });
});

// ──────────────────────────────────────────────
// getMonthlyDepreciation
// ──────────────────────────────────────────────
describe('getMonthlyDepreciation', () => {
  it('calculates monthly depreciation for each equipment type', () => {
    const dep = getMonthlyDepreciation(equipment);
    // inversor: 12000 / (10 * 12) = 100
    expect(dep.inversor).toBe(100);
    // placas: 36000 / (25 * 12) = 120
    expect(dep.placas).toBe(120);
  });

  it('handles different equipment values', () => {
    const custom: Equipment = {
      inversor: { value: 6000, lifespanYears: 5 },
      placas: { value: 24000, lifespanYears: 20 },
    };
    const dep = getMonthlyDepreciation(custom);
    // inversor: 6000 / (5 * 12) = 100
    expect(dep.inversor).toBe(100);
    // placas: 24000 / (20 * 12) = 100
    expect(dep.placas).toBe(100);
  });

  it('returns fractional depreciation for non-round values', () => {
    const custom: Equipment = {
      inversor: { value: 10000, lifespanYears: 7 },
      placas: { value: 10000, lifespanYears: 7 },
    };
    const dep = getMonthlyDepreciation(custom);
    expect(dep.inversor).toBeCloseTo(10000 / 84);
    expect(dep.placas).toBeCloseTo(10000 / 84);
  });
});

// ──────────────────────────────────────────────
// getEquipmentWithDepreciation
// ──────────────────────────────────────────────
describe('getEquipmentWithDepreciation', () => {
  it('returns original value at month 0', () => {
    const dep = getEquipmentWithDepreciation(equipment, 0);
    expect(dep.inversor).toBe(12000);
    expect(dep.placas).toBe(36000);
  });

  it('depreciates correctly after 12 months', () => {
    const dep = getEquipmentWithDepreciation(equipment, 12);
    // inversor: 12000 - 100 * 12 = 10800
    expect(dep.inversor).toBe(10800);
    // placas: 36000 - 120 * 12 = 34560
    expect(dep.placas).toBe(34560);
  });

  it('reaches 0 at end of lifespan', () => {
    const dep = getEquipmentWithDepreciation(equipment, 120); // 10 years
    expect(dep.inversor).toBe(0);
  });

  it('goes negative past lifespan (no clamping)', () => {
    const dep = getEquipmentWithDepreciation(equipment, 130);
    expect(dep.inversor).toBe(12000 - 100 * 130);
    expect(dep.inversor).toBeLessThan(0);
  });

  it('depreciates placas correctly at half lifespan', () => {
    // placas lifespan = 25 years = 300 months; half = 150
    const dep = getEquipmentWithDepreciation(equipment, 150);
    expect(dep.placas).toBe(36000 - 120 * 150);
    expect(dep.placas).toBe(18000);
  });
});

// ──────────────────────────────────────────────
// resolveMonthPricing
// ──────────────────────────────────────────────
describe('resolveMonthPricing', () => {
  it('derives charged and profit rates from discount', () => {
    const pricing = resolveMonthPricing(
      { discountPerKwh: 0.22, enelBaseCostPerKwh: 0.98 },
      { distributionFeePerKwh: 0.31 },
    );
    expect(pricing.chargedRatePerKwh).toBeCloseTo(0.76);
    expect(pricing.profitPerKwh).toBeCloseTo(0.45);
  });

  it('migrates legacy energyValue to discount', () => {
    const pricing = resolveMonthPricing(
      { energyValue: 0.45, enelBaseCostPerKwh: 0.98 },
      { distributionFeePerKwh: 0.31 },
    );
    expect(pricing.discountPerKwh).toBeCloseTo(0.22);
    expect(pricing.chargedRatePerKwh).toBeCloseTo(0.76);
    expect(pricing.profitPerKwh).toBeCloseTo(0.45);
  });
});

// ──────────────────────────────────────────────
// resolveEnelBaseCostPerKwh
// ──────────────────────────────────────────────
describe('resolveEnelBaseCostPerKwh', () => {
  it('uses month value when set', () => {
    expect(resolveEnelBaseCostPerKwh({ enelBaseCostPerKwh: 0.95 })).toBe(0.95);
  });

  it('returns 0 when month value is missing', () => {
    expect(resolveEnelBaseCostPerKwh({})).toBe(0);
  });
});

// ──────────────────────────────────────────────
// migrateEnelBaseCost
// ──────────────────────────────────────────────
describe('migrateEnelBaseCost', () => {
  it('backfills enelBaseCostPerKwh from legacy enelTariff and removes it from settings', () => {
    const data = makeAppData({
      '2024-01': makeMonthData({ enelBaseCostPerKwh: undefined }),
      '2024-02': makeMonthData({ enelBaseCostPerKwh: 1.01 }),
    });
    (data.settings as { enelTariff?: number }).enelTariff = 0.95;

    const { data: migrated, changed } = migrateEnelBaseCost(data);

    expect(changed).toBe(true);
    expect(migrated.months['2024-01']!.enelBaseCostPerKwh).toBe(0.95);
    expect(migrated.months['2024-02']!.enelBaseCostPerKwh).toBe(1.01);
    expect('enelTariff' in migrated.settings).toBe(false);
  });
});

// ──────────────────────────────────────────────
// migrateMonthDiscounts
// ──────────────────────────────────────────────
describe('migrateMonthDiscounts', () => {
  it('backfills discountPerKwh while preserving energyValue', () => {
    const data = makeAppData({
      '2024-01': makeMonthData({ energyValue: 0.45, discountPerKwh: undefined }),
      '2024-02': makeMonthData({ discountPerKwh: 0.22, energyValue: 0.45 }),
    });
    data.settings = {
      ...data.settings,
      distributionFeePerKwh: 0.31,
    };
    data.months['2024-01'] = makeMonthData({
      energyValue: 0.45,
      discountPerKwh: undefined,
      enelBaseCostPerKwh: 0.98,
    });

    const { data: migrated, changed } = migrateMonthDiscounts(data);

    expect(changed).toBe(true);
    expect(migrated.months['2024-01']!.discountPerKwh).toBeCloseTo(0.22);
    expect(migrated.months['2024-01']!.energyValue).toBe(0.45);
    expect(migrated.months['2024-02']!.discountPerKwh).toBe(0.22);
  });

  it('returns unchanged data when all months already migrated', () => {
    const data = makeAppData({
      '2024-01': makeMonthData({ discountPerKwh: 0.22 }),
    });

    const { data: migrated, changed } = migrateMonthDiscounts(data);

    expect(changed).toBe(false);
    expect(migrated).toBe(data);
  });
});

// ──────────────────────────────────────────────
// calculateMemberResults
// ──────────────────────────────────────────────
describe('calculateMemberResults', () => {
  it('calculates resultado and cobrar correctly', () => {
    const credits: MemberCredits = { consumo: 200, taxas: 10 };
    const result = calculateMemberResults(credits, defaultPricing);
    expect(result.consumo).toBe(200);
    expect(result.taxas).toBe(10);
    expect(result.resultado).toBe(150); // 200 * 0.75 margin
    expect(result.cobrar).toBe(160); // 10 + 150
  });

  it('returns zeros when credits are undefined', () => {
    const result = calculateMemberResults(undefined, defaultPricing);
    expect(result.consumo).toBe(0);
    expect(result.consumoNaoCompensado).toBe(0);
    expect(result.taxas).toBe(0);
    expect(result.resultado).toBe(0);
    expect(result.cobrar).toBe(0);
  });

  it('passes through consumoNaoCompensado without affecting billing', () => {
    const credits: MemberCredits = { consumo: 200, taxas: 10, consumoNaoCompensado: 50 };
    const result = calculateMemberResults(credits, defaultPricing);
    expect(result.consumoNaoCompensado).toBe(50);
    expect(result.resultado).toBe(150);
    expect(result.cobrar).toBe(160);
  });

  it('handles zero charged rate', () => {
    const credits: MemberCredits = { consumo: 200, taxas: 10 };
    const result = calculateMemberResults(credits, {
      discountPerKwh: 1.05,
      chargedRatePerKwh: 0,
      profitPerKwh: 0,
    });
    expect(result.resultado).toBe(0);
    expect(result.cobrar).toBe(10);
  });

  it('handles high charged rate', () => {
    const credits: MemberCredits = { consumo: 100, taxas: 5 };
    const result = calculateMemberResults(credits, {
      discountPerKwh: -0.45,
      chargedRatePerKwh: 1.50,
      profitPerKwh: 1.50,
    });
    expect(result.resultado).toBe(150);
    expect(result.cobrar).toBe(155);
  });

  it('handles zero consumo with taxas', () => {
    const credits: MemberCredits = { consumo: 0, taxas: 25 };
    const result = calculateMemberResults(credits, defaultPricing);
    expect(result.resultado).toBe(0);
    expect(result.cobrar).toBe(25);
  });

  it('handles negative taxas', () => {
    const credits: MemberCredits = { consumo: 100, taxas: -10 };
    const result = calculateMemberResults(credits, defaultPricing);
    expect(result.resultado).toBe(75);
    expect(result.taxasGerais).toBe(0);
    expect(result.cobrar).toBe(65);
  });

  it('returns zeros for resultado and cobrar when taxas is 0 (no taxes)', () => {
    const credits: MemberCredits = { consumo: 200, taxas: 0 };
    const result = calculateMemberResults(credits, defaultPricing);
    expect(result.consumo).toBe(200);
    expect(result.taxas).toBe(0);
    expect(result.resultado).toBe(0);
    expect(result.cobrar).toBe(0);
  });

  it('keeps GD2-equivalent margin when Enel bills as GD1', () => {
    const pricing = {
      discountPerKwh: 0.22,
      chargedRatePerKwh: 0.76,
      profitPerKwh: 0.45,
    };
    const gd1Credits: MemberCredits = { consumo: 200, taxas: 30, gd1: true };
    const gd2Credits: MemberCredits = { consumo: 200, taxas: 66, gd1: false };
    const billing = {
      distributionFeePerKwh: 0.31,
      gd1DistributionFeePerKwh: 0.13,
    };

    const gd1 = calculateMemberResults(gd1Credits, pricing, billing);
    const gd2 = calculateMemberResults(gd2Credits, pricing, billing);

    expect(gd1.resultado).toBeCloseTo(90);
    expect(gd1.taxasGerais).toBeCloseTo(4);
    expect(gd1.cobrar).toBeCloseTo(120);
    expect(gd2.resultado).toBeCloseTo(90);
    expect(gd2.cobrar).toBeCloseTo(156);
  });

  it('does not normalize GD1 when flag is false', () => {
    const pricing = {
      discountPerKwh: 0.22,
      chargedRatePerKwh: 0.76,
      profitPerKwh: 0.45,
    };
    const credits: MemberCredits = { consumo: 200, taxas: 30, gd1: false };
    const result = calculateMemberResults(credits, pricing, {
      distributionFeePerKwh: 0.31,
      gd1DistributionFeePerKwh: 0.13,
    });
    expect(result.cobrar).toBeCloseTo(120);
  });

  it('subtracts non-compensated energy and distribution from taxas', () => {
    const pricing = {
      discountPerKwh: 0.28,
      chargedRatePerKwh: 0.73,
      profitPerKwh: 0.42,
    };
    const credits: MemberCredits = {
      consumo: 168,
      taxas: 170.12,
      consumoNaoCompensado: 100,
      gd1: true,
    };
    const result = calculateMemberResults(credits, pricing, {
      distributionFeePerKwh: 0.31,
      gd1DistributionFeePerKwh: 0.12,
      enelBaseCostPerKwh: 1.01,
    });

    // 170.12 - (100 × 1.01) - (168 × 0.12) = 48.96
    expect(result.taxasGerais).toBeCloseTo(48.96);
    expect(result.resultado).toBeCloseTo(70.56);
    expect(result.cobrar).toBeCloseTo(240.68);
  });
});

// ──────────────────────────────────────────────
// getEnelBillBreakdown
// ──────────────────────────────────────────────
describe('getEnelBillBreakdown', () => {
  it('splits the Enel bill into non-compensated energy, TUSD, and other fees', () => {
    const credits: MemberCredits = {
      consumo: 168,
      taxas: 170.12,
      consumoNaoCompensado: 100,
      gd1: true,
    };
    const breakdown = getEnelBillBreakdown(credits, {
      distributionFeePerKwh: 0.31,
      gd1DistributionFeePerKwh: 0.12,
      enelBaseCostPerKwh: 1.01,
    });

    expect(breakdown.valorNaoCompensado).toBeCloseTo(101);
    expect(breakdown.tusdCompensada).toBeCloseTo(20.16);
    expect(breakdown.demaisEncargos).toBeCloseTo(48.96);
    expect(breakdown.total).toBeCloseTo(170.12);
  });
});

// ──────────────────────────────────────────────
// calculateMonthlyCosts
// ──────────────────────────────────────────────
describe('calculateMonthlyCosts', () => {
  it('includes depreciation and all cost fields', () => {
    const monthData = makeMonthData();
    const costs = calculateMonthlyCosts(monthData, equipment);

    expect(costs.depreciacaoInversor).toBe(100);
    expect(costs.depreciacaoPlacas).toBe(120);
    expect(costs.internet).toBe(100);
    expect(costs.seguro).toBe(50);
    expect(costs.iluminacaoPublica).toBe(30);
    expect(costs.vigilante).toBe(20);
    expect(costs.limpeza).toBe(15);
    expect(costs.trocaTitularidade).toBe(10);
    expect(costs.impostos).toBe(25);
    expect(costs.taxasEconomy).toBe(5);
  });

  it('defaults missing cost fields to 0', () => {
    const monthData = makeMonthData({
      costs: {} as MonthData['costs'],
    });
    const costs = calculateMonthlyCosts(monthData, equipment);
    expect(costs.internet).toBe(0);
    expect(costs.seguro).toBe(0);
    expect(costs.iluminacaoPublica).toBe(0);
    expect(costs.vigilante).toBe(0);
    expect(costs.limpeza).toBe(0);
    expect(costs.trocaTitularidade).toBe(0);
    expect(costs.impostos).toBe(0);
    expect(costs.taxasEconomy).toBe(0);
  });

  it('always includes depreciation regardless of costs', () => {
    const monthData = makeMonthData({ costs: {} as MonthData['costs'] });
    const costs = calculateMonthlyCosts(monthData, equipment);
    expect(costs.depreciacaoInversor).toBe(100);
    expect(costs.depreciacaoPlacas).toBe(120);
  });
});

// ──────────────────────────────────────────────
// calculateTotalCosts
// ──────────────────────────────────────────────
describe('calculateTotalCosts', () => {
  it('sums all cost values', () => {
    const costs: ComputedCosts = {
      depreciacaoInversor: 100,
      depreciacaoPlacas: 120,
      internet: 100,
      seguro: 50,
      iluminacaoPublica: 30,
      vigilante: 20,
      limpeza: 15,
      trocaTitularidade: 10,
      impostos: 25,
      taxasEconomy: 5,
    };
    expect(calculateTotalCosts(costs)).toBe(475);
  });

  it('returns 0 when all costs are zero', () => {
    const costs: ComputedCosts = {
      depreciacaoInversor: 0,
      depreciacaoPlacas: 0,
      internet: 0,
      seguro: 0,
      iluminacaoPublica: 0,
      vigilante: 0,
      limpeza: 0,
      trocaTitularidade: 0,
      impostos: 0,
      taxasEconomy: 0,
    };
    expect(calculateTotalCosts(costs)).toBe(0);
  });

  it('handles single non-zero cost', () => {
    const costs: ComputedCosts = {
      depreciacaoInversor: 0,
      depreciacaoPlacas: 0,
      internet: 99.99,
      seguro: 0,
      iluminacaoPublica: 0,
      vigilante: 0,
      limpeza: 0,
      trocaTitularidade: 0,
      impostos: 0,
      taxasEconomy: 0,
    };
    expect(calculateTotalCosts(costs)).toBeCloseTo(99.99);
  });
});

// ──────────────────────────────────────────────
// calculateMonthGains
// ──────────────────────────────────────────────
describe('calculateMonthGains', () => {
  it('calculates all gain components', () => {
    const monthData = makeMonthData();
    const gains = calculateMonthGains(monthData, members, defaultPricing);

    expect(gains.economyEnergy).toBe(50);
    expect(gains.ganhoCreditos).toBe(75); // 100 * 0.75
    // pai: (200*0.75)+10 = 160, mae: (150*0.75)+8 = 120.5
    expect(gains.resultadoParentes).toBeCloseTo(280.5);
    expect(gains.economiaPropria).toBe(225); // 300 * 0.75
  });

  it('returns zeros with no data', () => {
    const monthData = makeMonthData({
      economyEnergy: 0,
      creditosCompensar: 0,
      thiagoConsumo: 0,
      credits: {},
    });
    const gains = calculateMonthGains(monthData, members, defaultPricing);
    expect(gains.economyEnergy).toBe(0);
    expect(gains.ganhoCreditos).toBe(0);
    expect(gains.resultadoParentes).toBe(0);
    expect(gains.economiaPropria).toBe(0);
  });

  it('calculates correctly with single member', () => {
    const singleMember: Member[] = [{ id: 'pai', name: 'Pai', address: 'Rua A' }];
    const monthData = makeMonthData();
    const gains = calculateMonthGains(monthData, singleMember, defaultPricing);

    // Only pai: (200*0.75)+10 = 160
    expect(gains.resultadoParentes).toBe(160);
  });

  it('calculates correctly with no members', () => {
    const monthData = makeMonthData();
    const gains = calculateMonthGains(monthData, [], defaultPricing);
    expect(gains.resultadoParentes).toBe(0);
    // Other gains remain
    expect(gains.economyEnergy).toBe(50);
    expect(gains.ganhoCreditos).toBe(75);
    expect(gains.economiaPropria).toBe(225);
  });

  it('uses default credits for members without entries', () => {
    const monthData = makeMonthData({ credits: {} }); // no member credits
    const gains = calculateMonthGains(monthData, members, defaultPricing);
    // All members default to consumo:0, taxas:0 → cobrar:0 each
    expect(gains.resultadoParentes).toBe(0);
  });
});

// ──────────────────────────────────────────────
// computeMonthValues
// ──────────────────────────────────────────────
describe('computeMonthValues', () => {
  it('returns null for non-existent month', () => {
    const data = makeAppData({});
    expect(computeMonthValues('2024-03', data)).toBeNull();
  });

  it('computes full month values correctly', () => {
    const monthData = makeMonthData();
    const data = makeAppData({ '2024-03': monthData });
    const result = computeMonthValues('2024-03', data);

    expect(result).not.toBeNull();
    expect(result!.monthKey).toBe('2024-03');
    expect(result!.monthIdx).toBe(3); // March = month 3 from Jan start
    expect(result!.discountPerKwh).toBe(0.30);
    expect(result!.enelBaseCostPerKwh).toBe(1.05);
    expect(result!.chargedRatePerKwh).toBe(0.75);
    expect(result!.profitPerKwh).toBe(0.75);

    // Equipment depreciation at month 3
    expect(result!.equipDep.inversor).toBe(12000 - 100 * 3);
    expect(result!.equipDep.placas).toBe(36000 - 120 * 3);

    // Total costs = sum of all costs
    expect(result!.totalCosts).toBe(
      100 + 120 + 100 + 50 + 30 + 20 + 15 + 10 + 25 + 5,
    );

    // Member results
    expect(result!.memberResults['pai']!.cobrar).toBe(160);
    expect(result!.memberResults['mae']!.cobrar).toBeCloseTo(120.5);

    // Gains
    expect(result!.totalGains).toBeCloseTo(50 + 75 + 280.5 + 225);

    // resultadoMes = energyRemainder × profitPerKwh - totalCosts
    expect(result!.resultadoMes).toBeCloseTo(
      result!.energyRemainder * result!.profitPerKwh - result!.totalCosts,
    );
  });

  it('calculates cumulative paraBalanco across months', () => {
    const m1 = makeMonthData({ creditosCompensar: 100 });
    const m2 = makeMonthData({ creditosCompensar: 50, discountPerKwh: 0.25 });
    const data = makeAppData({
      '2024-01': m1,
      '2024-02': m2,
    });

    const result = computeMonthValues('2024-02', data);
    // cumulative balance: (100-650) + (50-650) = -1150, × current profitPerKwh 0.80
    expect(result!.paraBalanco).toBeCloseTo(-1150 * 0.80);
  });

  it('paraBalanco for the first month equals generated minus consumed × profitPerKwh', () => {
    const m1 = makeMonthData({ creditosCompensar: 80, discountPerKwh: 0.45 });
    const data = makeAppData({ '2024-01': m1 });

    const result = computeMonthValues('2024-01', data);
    // generated 80, consumed 650 (200+150+300 thiago) → balance -570
    expect(result!.paraBalanco).toBeCloseTo(-570 * 0.60);
  });

  it('paraBalanco decreases when consumption exceeds generation', () => {
    const m1 = makeMonthData({
      creditosCompensar: 1000,
      thiagoConsumo: 0,
      credits: {
        pai: { consumo: 300, taxas: 10 },
        mae: { consumo: 200, taxas: 8 },
      },
    });
    const m2 = makeMonthData({
      creditosCompensar: 0,
      thiagoConsumo: 400,
      credits: {
        pai: { consumo: 300, taxas: 10 },
        mae: { consumo: 200, taxas: 8 },
      },
    });
    const data = makeAppData({
      '2024-01': m1,
      '2024-02': m2,
    });

    const result = computeMonthValues('2024-02', data);
    // month 1: 1000-500=500, month 2: 0-900=-900 → cumulative -400
    expect(result!.paraBalanco).toBeCloseTo(-400 * 0.75);
  });

  it('includes thiagoConsumo in output', () => {
    const monthData = makeMonthData({ thiagoConsumo: 400 });
    const data = makeAppData({ '2024-01': monthData });
    const result = computeMonthValues('2024-01', data);

    expect(result!.thiagoConsumo).toBe(400);
  });

  it('uses zero discount when pricing is missing', () => {
    const monthData = makeMonthData({
      discountPerKwh: undefined,
      energyValue: undefined,
      enelBaseCostPerKwh: 1.05,
    });
    const data = makeAppData({ '2024-01': monthData });
    const result = computeMonthValues('2024-01', data);

    expect(result!.discountPerKwh).toBe(0);
    expect(result!.chargedRatePerKwh).toBe(1.05);
    expect(result!.profitPerKwh).toBe(1.05);
    expect(result!.memberResults['pai']!.cobrar).toBeCloseTo(220);
    expect(result!.memberResults['mae']!.cobrar).toBeCloseTo(165.5);
  });

  it('handles data with no members', () => {
    const monthData = makeMonthData();
    const data: AppData = {
      ...makeAppData({ '2024-01': monthData }),
      members: [],
    };
    const result = computeMonthValues('2024-01', data);

    expect(result).not.toBeNull();
    expect(Object.keys(result!.memberResults)).toHaveLength(0);
    expect(result!.gains.resultadoParentes).toBe(0);
  });
});

// ──────────────────────────────────────────────
// formatBRL
// ──────────────────────────────────────────────
describe('formatBRL', () => {
  it('formats positive values in BRL', () => {
    const formatted = formatBRL(1234.56);
    expect(formatted).toContain('1.234,56');
    expect(formatted).toContain('R$');
  });

  it('formats zero', () => {
    const formatted = formatBRL(0);
    expect(formatted).toContain('0,00');
  });

  it('formats negative values', () => {
    const formatted = formatBRL(-500);
    expect(formatted).toContain('500,00');
  });

  it('formats large values with thousands separators', () => {
    const formatted = formatBRL(1000000);
    expect(formatted).toContain('1.000.000,00');
  });

  it('formats small fractional values', () => {
    const formatted = formatBRL(0.01);
    expect(formatted).toContain('0,01');
  });
});

// ──────────────────────────────────────────────
// formatNumber
// ──────────────────────────────────────────────
describe('formatNumber', () => {
  it('formats with default 2 decimal places', () => {
    expect(formatNumber(1234.5)).toBe('1.234,50');
  });

  it('formats with custom decimal places', () => {
    expect(formatNumber(1234.5678, 3)).toBe('1.234,568');
  });

  it('formats integer values', () => {
    expect(formatNumber(1000)).toBe('1.000,00');
  });

  it('formats 0 decimal places', () => {
    expect(formatNumber(1234.56, 0)).toBe('1.235');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0,00');
  });

  it('formats 4 decimal places', () => {
    expect(formatNumber(0.75, 4)).toBe('0,7500');
  });
});

// ──────────────────────────────────────────────
// formatMonthLabel
// ──────────────────────────────────────────────
describe('formatMonthLabel', () => {
  it('formats January correctly', () => {
    expect(formatMonthLabel('2024-01')).toBe('jan./24');
  });

  it('formats December correctly', () => {
    expect(formatMonthLabel('2024-12')).toBe('dez./24');
  });

  it('formats mid-year month', () => {
    expect(formatMonthLabel('2025-06')).toBe('jun./25');
  });

  it('formats all months of the year', () => {
    const expected = [
      'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
      'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.',
    ];
    for (let i = 1; i <= 12; i++) {
      const key = `2024-${String(i).padStart(2, '0')}`;
      const label = formatMonthLabel(key);
      expect(label).toBe(`${expected[i - 1]}/24`);
    }
  });
});

// ──────────────────────────────────────────────
// getNextMonthKey
// ──────────────────────────────────────────────
describe('getNextMonthKey', () => {
  it('returns the next month after the last existing key', () => {
    const months = {
      '2024-01': makeMonthData(),
      '2024-02': makeMonthData(),
      '2024-03': makeMonthData(),
    };
    expect(getNextMonthKey(months)).toBe('2024-04');
  });

  it('handles December to January rollover', () => {
    const months = {
      '2024-12': makeMonthData(),
    };
    expect(getNextMonthKey(months)).toBe('2025-01');
  });

  it('returns current month when no months exist', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(getNextMonthKey({})).toBe(expected);
  });

  it('pads single digit months with zero', () => {
    const months = {
      '2024-08': makeMonthData(),
    };
    expect(getNextMonthKey(months)).toBe('2024-09');
  });

  it('uses the chronologically last key even when unsorted', () => {
    const months = {
      '2024-05': makeMonthData(),
      '2024-01': makeMonthData(),
      '2024-09': makeMonthData(),
    };
    expect(getNextMonthKey(months)).toBe('2024-10');
  });

  it('handles year-end boundary from November', () => {
    const months = {
      '2024-11': makeMonthData(),
    };
    expect(getNextMonthKey(months)).toBe('2024-12');
  });
});
