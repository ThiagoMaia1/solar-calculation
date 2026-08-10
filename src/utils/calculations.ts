import type {
  Equipment,
  MemberCredits,
  MonthData,
  Member,
  AppData,
  DepreciationValues,
  MemberResult,
  ComputedCosts,
  MonthGains,
  ComputedMonthValues,
  Settings,
} from '../types';

/**
 * Get the 1-based month index from a month key (YYYY-MM) relative to start date.
 */
export function getMonthIndex(monthKey: string, startDate: string): number {
  const [startYear, startMonth] = startDate.split('-').map(Number);
  const [year, month] = monthKey.split('-').map(Number);
  return (year! - startYear!) * 12 + (month! - startMonth!) + 1;
}

/**
 * Calculate monthly depreciation for each equipment type.
 */
export function getMonthlyDepreciation(equipment: Equipment): DepreciationValues {
  return {
    inversor: equipment.inversor.value / (equipment.inversor.lifespanYears * 12),
    placas: equipment.placas.value / (equipment.placas.lifespanYears * 12),
  };
}

/**
 * Equipment value after depreciation at a given month index.
 */
export function getEquipmentWithDepreciation(
  equipment: Equipment,
  monthIndex: number,
): DepreciationValues {
  const dep = getMonthlyDepreciation(equipment);
  return {
    inversor: equipment.inversor.value - dep.inversor * monthIndex,
    placas: equipment.placas.value - dep.placas * monthIndex,
  };
}

export interface MemberBillingOptions {
  distributionFeePerKwh?: number;
  gd1DistributionFeePerKwh?: number;
  /** Enel rate per kWh for non-compensated energy — used to split taxas */
  enelBaseCostPerKwh?: number;
}

export interface MonthPricing {
  discountPerKwh: number;
  chargedRatePerKwh: number;
  profitPerKwh: number;
}

/**
 * Resolve customer-facing and internal pricing from month data.
 * Legacy months store energyValue (profit margin); new months store discountPerKwh.
 */
export function resolveMonthPricing(
  monthData: Pick<MonthData, 'discountPerKwh' | 'energyValue' | 'enelBaseCostPerKwh'>,
  settings: Pick<Settings, 'distributionFeePerKwh'>,
): MonthPricing {
  const enelBase = monthData.enelBaseCostPerKwh ?? 0;
  const distFee = settings.distributionFeePerKwh ?? 0;

  let discountPerKwh = monthData.discountPerKwh;
  if (discountPerKwh == null) {
    if (monthData.energyValue != null) {
      discountPerKwh = enelBase - monthData.energyValue - distFee;
    } else {
      discountPerKwh = 0;
    }
  }

  const chargedRatePerKwh = enelBase - discountPerKwh;
  const profitPerKwh = chargedRatePerKwh - distFee;

  return { discountPerKwh, chargedRatePerKwh, profitPerKwh };
}

export function resolveEnelBaseCostPerKwh(
  monthData: Pick<MonthData, 'enelBaseCostPerKwh'>,
): number {
  return monthData.enelBaseCostPerKwh ?? 0;
}

/**
 * Backfill enelBaseCostPerKwh from legacy settings.enelTariff, then remove enelTariff.
 */
export function migrateEnelBaseCost(
  data: AppData,
): { data: AppData; changed: boolean } {
  const legacyTariff = (data.settings as Settings & { enelTariff?: number }).enelTariff;
  let changed = false;
  const months = { ...data.months };

  if (legacyTariff != null) {
    for (const [monthKey, month] of Object.entries(data.months)) {
      if (month.enelBaseCostPerKwh != null) continue;
      months[monthKey] = { ...month, enelBaseCostPerKwh: legacyTariff };
      changed = true;
    }
  }

  if ('enelTariff' in data.settings) {
    const { enelTariff: _, ...restSettings } = data.settings as Settings & { enelTariff?: number };
    return {
      data: { ...data, settings: restSettings as Settings, months },
      changed: true,
    };
  }

  return changed ? { data: { ...data, months }, changed: true } : { data, changed: false };
}

/**
 * Backfill discountPerKwh from legacy energyValue without removing historical data.
 */
export function migrateMonthDiscounts(
  data: AppData,
): { data: AppData; changed: boolean } {
  let changed = false;
  const months = { ...data.months };

  for (const [monthKey, month] of Object.entries(data.months)) {
    if (month.discountPerKwh != null || month.energyValue == null) continue;

    const { discountPerKwh } = resolveMonthPricing(month, data.settings);
    months[monthKey] = { ...month, discountPerKwh };
    changed = true;
  }

  return changed ? { data: { ...data, months }, changed: true } : { data, changed: false };
}

function getMemberDistributionFee(
  memberCredits: MemberCredits | undefined,
  billingOptions?: MemberBillingOptions,
): number {
  const gd2DistFee = billingOptions?.distributionFeePerKwh ?? 0;
  const gd1DistFee = billingOptions?.gd1DistributionFeePerKwh ?? 0;
  if (memberCredits?.gd1 && gd1DistFee > 0) return gd1DistFee;
  return gd2DistFee;
}

function getTaxasGerais(
  consumo: number,
  consumoNaoCompensado: number,
  taxas: number,
  memberCredits: MemberCredits | undefined,
  billingOptions?: MemberBillingOptions,
): number {
  const { demaisEncargos } = getEnelBillComponents(
    consumo,
    consumoNaoCompensado,
    taxas,
    memberCredits,
    billingOptions,
  );
  return demaisEncargos;
}

export interface EnelBillBreakdown {
  valorNaoCompensado: number;
  tusdCompensada: number;
  demaisEncargos: number;
  total: number;
}

/** Split the Enel bill into non-compensated energy, compensated TUSD, and other fees. */
export function getEnelBillBreakdown(
  memberCredits: MemberCredits | undefined,
  billingOptions?: MemberBillingOptions,
): EnelBillBreakdown {
  const consumo = memberCredits?.consumo ?? 0;
  const consumoNaoCompensado = memberCredits?.consumoNaoCompensado ?? 0;
  const taxas = memberCredits?.taxas ?? 0;
  const components = getEnelBillComponents(
    consumo,
    consumoNaoCompensado,
    taxas,
    memberCredits,
    billingOptions,
  );
  return { ...components, total: taxas };
}

function getEnelBillComponents(
  consumo: number,
  consumoNaoCompensado: number,
  taxas: number,
  memberCredits: MemberCredits | undefined,
  billingOptions?: MemberBillingOptions,
): Omit<EnelBillBreakdown, 'total'> {
  const distFee = getMemberDistributionFee(memberCredits, billingOptions);
  const enelBaseCostPerKwh = billingOptions?.enelBaseCostPerKwh ?? 0;
  const valorNaoCompensado = consumoNaoCompensado * enelBaseCostPerKwh;
  const tusdCompensada = consumo * distFee;
  const demaisEncargos = Math.max(0, taxas - valorNaoCompensado - tusdCompensada);
  return { valorNaoCompensado, tusdCompensada, demaisEncargos };
}

/**
 * Calculate results for a family member.
 * resultado = consumo × profitPerKwh (operator margin on compensated energy)
 * cobrar = taxas + resultado (full Enel bill repasse + margin)
 *
 * taxasGerais = taxas − (consumoNaoCompensado × enelBaseCost) − (consumo × distFee)
 *
 * When taxas is 0 or missing, we skip the calculation because the Enel bill
 * data has not been entered yet and the result would be incorrect.
 */
export function calculateMemberResults(
  memberCredits: MemberCredits | undefined,
  pricing: MonthPricing,
  billingOptions?: MemberBillingOptions,
): MemberResult {
  const consumo = memberCredits?.consumo ?? 0;
  const consumoNaoCompensado = memberCredits?.consumoNaoCompensado ?? 0;
  const taxas = memberCredits?.taxas ?? 0;

  // Without taxes the calculation is incomplete — return zeros for computed fields
  if (taxas === 0) {
    return {
      consumo,
      consumoNaoCompensado,
      taxas: 0,
      taxasGerais: 0,
      resultado: 0,
      chargedRatePerKwh: pricing.chargedRatePerKwh,
      profitPerKwh: pricing.profitPerKwh,
      cobrar: 0,
    };
  }

  const taxasGerais = getTaxasGerais(
    consumo,
    consumoNaoCompensado,
    taxas,
    memberCredits,
    billingOptions,
  );
  const resultado = consumo * pricing.profitPerKwh;
  const cobrar = taxas + resultado;
  return {
    consumo,
    consumoNaoCompensado,
    taxas,
    taxasGerais,
    resultado,
    chargedRatePerKwh: pricing.chargedRatePerKwh,
    profitPerKwh: pricing.profitPerKwh,
    cobrar,
  };
}

/**
 * Calculate all costs for a month.
 */
export function calculateMonthlyCosts(
  monthData: MonthData,
  equipment: Equipment,
): ComputedCosts {
  const dep = getMonthlyDepreciation(equipment);
  const costs = monthData.costs;
  return {
    depreciacaoInversor: dep.inversor,
    depreciacaoPlacas: dep.placas,
    internet: costs?.internet ?? 0,
    seguro: costs?.seguro ?? 0,
    iluminacaoPublica: costs?.iluminacaoPublica ?? 0,
    vigilante: costs?.vigilante ?? 0,
    limpeza: costs?.limpeza ?? 0,
    trocaTitularidade: costs?.trocaTitularidade ?? 0,
    impostos: costs?.impostos ?? 0,
    taxasEconomy: costs?.taxasEconomy ?? 0,
  };
}

/**
 * Sum all costs.
 */
export function calculateTotalCosts(costs: ComputedCosts): number {
  return Object.values(costs).reduce((sum, val) => sum + val, 0);
}

/**
 * Calculate gains for a month.
 */
export function calculateMonthGains(
  monthData: MonthData,
  members: Member[],
  pricing: MonthPricing,
  billingOptions?: MemberBillingOptions,
): MonthGains {
  const economyEnergy = monthData.economyEnergy ?? 0;
  const ganhoCreditos = (monthData.creditosCompensar ?? 0) * pricing.profitPerKwh;

  let resultadoParentes = 0;
  for (const member of members) {
    const credits = monthData.credits?.[member.id] ?? { consumo: 0, taxas: 0 };
    const { cobrar } = calculateMemberResults(credits, pricing, billingOptions);
    resultadoParentes += cobrar;
  }

  const economiaPropria = (monthData.thiagoConsumo ?? 0) * pricing.profitPerKwh;

  return { economyEnergy, ganhoCreditos, resultadoParentes, economiaPropria };
}

/**
 * Compute all values for a single month for dashboard display.
 */
export function computeMonthValues(
  monthKey: string,
  data: AppData,
): ComputedMonthValues | null {
  const monthData = data.months[monthKey];
  if (!monthData) return null;

  const { equipment, members, settings } = data;
  const monthIdx = getMonthIndex(monthKey, settings.startDate);
  const pricing = resolveMonthPricing(monthData, settings);
  const billingOptions: MemberBillingOptions = {
    distributionFeePerKwh: settings.distributionFeePerKwh,
    gd1DistributionFeePerKwh: settings.gd1DistributionFeePerKwh,
    enelBaseCostPerKwh: resolveEnelBaseCostPerKwh(monthData),
  };

  // Equipment depreciation
  const equipDep = getEquipmentWithDepreciation(equipment, monthIdx);

  // Costs
  const costs = calculateMonthlyCosts(monthData, equipment);
  const totalCosts = calculateTotalCosts(costs);

  // Member results
  const memberResults: Record<string, MemberResult> = {};
  let membersConsumption = 0;
  for (const m of members) {
    const credits = monthData.credits?.[m.id] ?? { consumo: 0, taxas: 0 };
    memberResults[m.id] = calculateMemberResults(credits, pricing, billingOptions);
    membersConsumption += credits.consumo ?? 0;
  }

  const thiagoConsumo = monthData.thiagoConsumo ?? 0;
  const creditosCompensar = monthData.creditosCompensar ?? 0;
  const totalConsumption = membersConsumption + thiagoConsumo;
  const energyRemainder = creditosCompensar - totalConsumption;

  // Gains
  const gains = calculateMonthGains(monthData, members, pricing, billingOptions);
  const totalGains =
    gains.economyEnergy +
    gains.ganhoCreditos +
    gains.resultadoParentes +
    gains.economiaPropria;

  // Resultado mês = energy remainder × profit margin - costs
  const resultadoMes = energyRemainder * pricing.profitPerKwh - totalCosts;

  // Para o balanço (cumulative energy balance × current energy value)
  const sortedKeys = Object.keys(data.months).sort();
  const currentIdx = sortedKeys.indexOf(monthKey);
  let cumulativeBalance = 0;
  for (let i = 0; i <= currentIdx; i++) {
    const md = data.months[sortedKeys[i]!];
    const monthGenerated = md?.creditosCompensar ?? 0;
    let monthConsumed = md?.thiagoConsumo ?? 0;
    for (const m of members) {
      monthConsumed += md?.credits?.[m.id]?.consumo ?? 0;
    }
    cumulativeBalance += monthGenerated - monthConsumed;
  }
  const paraBalanco = cumulativeBalance * pricing.profitPerKwh;

  return {
    monthKey,
    monthIdx,
    discountPerKwh: pricing.discountPerKwh,
    enelBaseCostPerKwh: resolveEnelBaseCostPerKwh(monthData),
    chargedRatePerKwh: pricing.chargedRatePerKwh,
    profitPerKwh: pricing.profitPerKwh,
    equipDep,
    costs,
    totalCosts,
    memberResults,
    thiagoConsumo,
    creditosCompensar,
    totalConsumption,
    energyRemainder,
    gains,
    totalGains,
    resultadoMes,
    paraBalanco,
  };
}

// ── Formatting helpers ──

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const months = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ];
  return `${months[parseInt(month!, 10) - 1]}./${year!.slice(2)}`;
}

/**
 * Get the next month key after the last one in data.
 */
export function getNextMonthKey(months: Record<string, MonthData>): string {
  const keys = Object.keys(months).sort();
  if (keys.length === 0) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const last = keys[keys.length - 1]!;
  const [y, m] = last.split('-').map(Number);
  const nextMonth = m === 12 ? 1 : m! + 1;
  const nextYear = m === 12 ? y! + 1 : y!;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}
