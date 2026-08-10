// ── Data model types ──

export interface EquipmentItem {
  value: number;
  lifespanYears: number;
}

export interface Equipment {
  inversor: EquipmentItem;
  placas: EquipmentItem;
}

export interface PixConfig {
  key: string;
  merchantName: string;
  merchantCity: string;
}

export interface Member {
  id: string;
  name: string;
  address: string;
}

export interface MemberCredits {
  consumo: number;
  taxas: number;
  /** Energy beyond Enel's compensation limit — informational only, not used in billing calculations */
  consumoNaoCompensado?: number;
  /** Enel billed this member as GD1 (lower TUSD) for this month */
  gd1?: boolean;
}

export interface MonthlyCosts {
  internet: number;
  seguro: number;
  iluminacaoPublica: number;
  vigilante: number;
  limpeza: number;
  trocaTitularidade: number;
  impostos: number;
  taxasEconomy: number;
}

/** Default editable cost values per calendar month (01–12) for new month entry */
export type MonthCostDefaults = Pick<
  MonthlyCosts,
  'internet' | 'seguro' | 'iluminacaoPublica' | 'vigilante' | 'limpeza' | 'impostos'
>;

export interface Settings {
  startDate: string; // "YYYY-MM"
  pix?: PixConfig;
  /** Non-compensated distribution fee per kWh charged by Enel on solar credit bills (GD2) */
  distributionFeePerKwh?: number;
  /** Distribution fee per kWh when Enel bills the member as GD1 */
  gd1DistributionFeePerKwh?: number;
  /** Default cost values keyed by calendar month (01–12) */
  costDefaults?: Record<string, MonthCostDefaults>;
}

export interface MonthData {
  /** Discount from monthly Enel base tariff per kWh — primary pricing input */
  discountPerKwh?: number;
  /** Enel all-in rate per kWh for this billing month (TE + TUSD + taxes) */
  enelBaseCostPerKwh?: number;
  /** @deprecated Legacy profit margin; migrated to discountPerKwh on read */
  energyValue?: number;
  costs: MonthlyCosts;
  credits: Record<string, MemberCredits>;
  thiagoConsumo: number;
  creditosCompensar: number;
  economyEnergy: number;
}

export interface AppData {
  equipment: Equipment;
  settings: Settings;
  members: Member[];
  months: Record<string, MonthData>;
}

// ── Computed result types ──

export interface DepreciationValues {
  inversor: number;
  placas: number;
}

export interface MemberResult {
  consumo: number;
  consumoNaoCompensado: number;
  taxas: number;
  /** Enel fees excluding energy and distribution — informational breakdown of taxas */
  taxasGerais: number;
  /** Margin on compensated energy: consumo × profitPerKwh */
  resultado: number;
  chargedRatePerKwh: number;
  /** Internal margin per kWh after distribution — not shown on customer PDF */
  profitPerKwh: number;
  cobrar: number;
}

export interface ComputedCosts {
  depreciacaoInversor: number;
  depreciacaoPlacas: number;
  internet: number;
  seguro: number;
  iluminacaoPublica: number;
  vigilante: number;
  limpeza: number;
  trocaTitularidade: number;
  impostos: number;
  taxasEconomy: number;
}

export interface MonthGains {
  economyEnergy: number;
  ganhoCreditos: number;
  resultadoParentes: number;
  economiaPropria: number;
}

export interface ComputedMonthValues {
  monthKey: string;
  monthIdx: number;
  discountPerKwh: number;
  enelBaseCostPerKwh: number;
  chargedRatePerKwh: number;
  profitPerKwh: number;
  equipDep: DepreciationValues;
  costs: ComputedCosts;
  totalCosts: number;
  memberResults: Record<string, MemberResult>;
  thiagoConsumo: number;
  creditosCompensar: number;
  totalConsumption: number;
  energyRemainder: number;
  gains: MonthGains;
  totalGains: number;
  resultadoMes: number;
  paraBalanco: number;
}

export interface PdfPreview {
  url: string;
  filename: string;
  member: string;
  monthKey: string;
  pixPayload?: string;
}
