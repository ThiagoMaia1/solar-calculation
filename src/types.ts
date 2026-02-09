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

export interface Settings {
  enelTariff: number;
  startDate: string; // "YYYY-MM"
  pix?: PixConfig;
  /** Estimated variable tax per kWh on Enel bill (ICMS/PIS/COFINS that remain with solar) */
  estimatedTaxPerKwh?: number;
}

export interface Member {
  id: string;
  name: string;
  address: string;
}

export interface MemberCredits {
  consumo: number;
  taxas: number;
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

export interface MonthData {
  energyValue: number;
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
  taxas: number;
  resultado: number;
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
  energyValue: number;
  equipDep: DepreciationValues;
  costs: ComputedCosts;
  totalCosts: number;
  memberResults: Record<string, MemberResult>;
  thiagoConsumo: number;
  creditosCompensar: number;
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
}
