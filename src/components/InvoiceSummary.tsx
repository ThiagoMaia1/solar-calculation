import {
  formatMonthLabel,
  formatBRL,
  calculateMemberResults,
  resolveEnelBaseCostPerKwh,
  resolveMonthPricing,
} from '../utils/calculations';
import type { Member, MonthData, Settings } from '../types';

interface InvoiceSummaryProps {
  member: Member;
  monthData: MonthData;
  monthKey: string;
  settings: Settings;
}

export default function InvoiceSummary({ member, monthData, monthKey, settings }: InvoiceSummaryProps) {
  const memberCredits = monthData.credits?.[member.id];

  if (!memberCredits) return null;

  const pricing = resolveMonthPricing(monthData, settings);
  const enelBaseCostPerKwh = resolveEnelBaseCostPerKwh(monthData);
  const result = calculateMemberResults(memberCredits, pricing, {
    distributionFeePerKwh: settings.distributionFeePerKwh,
    gd1DistributionFeePerKwh: settings.gd1DistributionFeePerKwh,
    enelBaseCostPerKwh,
  });
  const hasTaxas = (memberCredits.taxas ?? 0) !== 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
      <p className="font-semibold text-gray-700">
        {member.name} — {formatMonthLabel(monthKey)}
      </p>
      <p className="text-gray-600">
        Consumo compensado: <span className="font-medium">{result.consumo} kWh</span>
      </p>
      {result.consumoNaoCompensado > 0 && (
        <p className="text-gray-600">
          Energia não compensada:{' '}
          <span className="font-medium">
            {result.consumoNaoCompensado} kWh × {formatBRL(enelBaseCostPerKwh)}/kWh ={' '}
            {formatBRL(result.consumoNaoCompensado * enelBaseCostPerKwh)}
          </span>
        </p>
      )}
      {hasTaxas ? (
        <>
          <p className="text-gray-600">
            Tarifa créditos (total):{' '}
            <span className="font-medium">{formatBRL(result.chargedRatePerKwh)}/kWh</span>
          </p>
          <p className="text-gray-600">
            Margem créditos: <span className="font-medium">{formatBRL(result.resultado)}</span>
          </p>
          <p className="text-gray-600">
            Fatura Enel (repasse): <span className="font-medium">{formatBRL(result.taxas)}</span>
          </p>
          <p className="text-gray-600">
            Demais encargos Enel: <span className="font-medium">{formatBRL(result.taxasGerais)}</span>
          </p>
          <p className="text-gray-800 font-bold">
            Total a cobrar: {formatBRL(result.cobrar)}
          </p>
        </>
      ) : (
        <p className="text-yellow-700 font-medium italic">
          Sem taxas — cálculo indisponível
        </p>
      )}
    </div>
  );
}
