import type { MonthCostDefaults, Settings } from '../types';

export const CALENDAR_MONTHS = [
  { key: '01', label: 'Jan' },
  { key: '02', label: 'Fev' },
  { key: '03', label: 'Mar' },
  { key: '04', label: 'Abr' },
  { key: '05', label: 'Mai' },
  { key: '06', label: 'Jun' },
  { key: '07', label: 'Jul' },
  { key: '08', label: 'Ago' },
  { key: '09', label: 'Set' },
  { key: '10', label: 'Out' },
  { key: '11', label: 'Nov' },
  { key: '12', label: 'Dez' },
] as const;

export const COST_DEFAULT_FIELDS: {
  key: keyof MonthCostDefaults;
  label: string;
}[] = [
  { key: 'internet', label: 'Internet' },
  { key: 'seguro', label: 'Seguro' },
  { key: 'iluminacaoPublica', label: 'Iluminação Pública' },
  { key: 'vigilante', label: 'Vigilante' },
  { key: 'limpeza', label: 'Limpeza/Manutenção' },
  { key: 'impostos', label: 'Impostos' },
];

const STANDARD_COSTS: MonthCostDefaults = {
  internet: 89.9,
  seguro: 200,
  iluminacaoPublica: 100.5,
  vigilante: 0,
  limpeza: 0,
  impostos: 90,
};

const ZERO_COSTS: MonthCostDefaults = {
  internet: 0,
  seguro: 0,
  iluminacaoPublica: 0,
  vigilante: 0,
  limpeza: 0,
  impostos: 0,
};

/** Built-in default cost values per calendar month (01–12). */
export const DEFAULT_COST_DEFAULTS: Record<string, MonthCostDefaults> = {
  '01': { ...STANDARD_COSTS },
  '02': { ...STANDARD_COSTS },
  '03': { ...STANDARD_COSTS },
  '04': { ...STANDARD_COSTS, limpeza: 409.6, impostos: 0 },
  '05': { ...STANDARD_COSTS, limpeza: 409.6 },
  '06': { ...ZERO_COSTS },
  '07': { ...STANDARD_COSTS },
  '08': { ...STANDARD_COSTS },
  '09': { ...STANDARD_COSTS },
  '10': { ...STANDARD_COSTS },
  '11': { ...STANDARD_COSTS },
  '12': { ...STANDARD_COSTS },
};

export function ensureCostDefaults(settings: Settings): Settings {
  if (settings.costDefaults) {
    return settings;
  }
  return {
    ...settings,
    costDefaults: { ...DEFAULT_COST_DEFAULTS },
  };
}

export function getCalendarMonthFromKey(monthKey: string): string {
  const [, month = '01'] = monthKey.split('-');
  return month.padStart(2, '0');
}

export function getDefaultCostsForMonthKey(
  monthKey: string,
  settings: Settings,
): MonthCostDefaults {
  const calendarMonth = getCalendarMonthFromKey(monthKey);
  const resolved = ensureCostDefaults(settings);
  return (
    resolved.costDefaults?.[calendarMonth] ??
    DEFAULT_COST_DEFAULTS[calendarMonth] ??
    { ...ZERO_COSTS }
  );
}

export function emptyCostDefaults(): Record<string, MonthCostDefaults> {
  return Object.fromEntries(
    CALENDAR_MONTHS.map(({ key }) => [key, { ...ZERO_COSTS }]),
  );
}
