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

/**
 * Calculate results for a family member.
 * resultado = consumo × energyValue (the credit value)
 * cobrar = resultado + taxas (total to charge them)
 *
 * When taxas is 0 or missing, we skip the calculation because the Enel bill
 * data has not been entered yet and the result would be incorrect.
 */
export function calculateMemberResults(
  memberCredits: MemberCredits | undefined,
  energyValue: number,
): MemberResult {
  const consumo = memberCredits?.consumo ?? 0;
  const taxas = memberCredits?.taxas ?? 0;

  // Without taxes the calculation is incomplete — return zeros for computed fields
  if (taxas === 0) {
    return { consumo, taxas: 0, resultado: 0, cobrar: 0 };
  }

  const resultado = consumo * energyValue;
  const cobrar = resultado + taxas;
  return { consumo, taxas, resultado, cobrar };
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
  energyValue: number,
): MonthGains {
  const economyEnergy = monthData.economyEnergy ?? 0;
  const ganhoCreditos = (monthData.creditosCompensar ?? 0) * energyValue;

  let resultadoParentes = 0;
  for (const member of members) {
    const credits = monthData.credits?.[member.id] ?? { consumo: 0, taxas: 0 };
    const { cobrar } = calculateMemberResults(credits, energyValue);
    resultadoParentes += cobrar;
  }

  const economiaPropria = (monthData.thiagoConsumo ?? 0) * energyValue;

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
  const energyValue = monthData.energyValue ?? 0;

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
    memberResults[m.id] = calculateMemberResults(credits, energyValue);
    membersConsumption += credits.consumo ?? 0;
  }

  const thiagoConsumo = monthData.thiagoConsumo ?? 0;
  const creditosCompensar = monthData.creditosCompensar ?? 0;
  const totalConsumption = membersConsumption + thiagoConsumo;
  const energyRemainder = creditosCompensar - totalConsumption;

  // Gains
  const gains = calculateMonthGains(monthData, members, energyValue);
  const totalGains =
    gains.economyEnergy +
    gains.ganhoCreditos +
    gains.resultadoParentes +
    gains.economiaPropria;

  // Resultado mês = energy remainder × energy value - costs
  const resultadoMes = energyRemainder * energyValue - totalCosts;

  // Para o balanço (cumulative credits × current energy value)
  const sortedKeys = Object.keys(data.months).sort();
  const currentIdx = sortedKeys.indexOf(monthKey);
  let cumulativeCredits = 0;
  for (let i = 0; i <= currentIdx; i++) {
    cumulativeCredits += data.months[sortedKeys[i]!]?.creditosCompensar ?? 0;
  }
  const paraBalanco = cumulativeCredits * energyValue;

  return {
    monthKey,
    monthIdx,
    energyValue,
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
