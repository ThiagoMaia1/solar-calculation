import { formatMonthLabel, formatBRL, calculateMemberResults } from '../utils/calculations';
import type { Member, MonthData } from '../types';

interface InvoiceSummaryProps {
  member: Member;
  monthData: MonthData;
  monthKey: string;
}

export default function InvoiceSummary({ member, monthData, monthKey }: InvoiceSummaryProps) {
  const memberCredits = monthData.credits?.[member.id];
  const energyValue = monthData.energyValue ?? 0;

  if (!memberCredits) return null;

  const result = calculateMemberResults(memberCredits, energyValue);
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
          Energia não compensada: <span className="font-medium">{result.consumoNaoCompensado} kWh</span>
        </p>
      )}
      {hasTaxas ? (
        <>
          <p className="text-gray-600">
            Valor créditos: <span className="font-medium">{formatBRL(result.resultado)}</span>
          </p>
          <p className="text-gray-600">
            Taxas: <span className="font-medium">{formatBRL(result.taxas)}</span>
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
