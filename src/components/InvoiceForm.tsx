import { useEffect, useState } from 'react';
import { formatMonthLabel } from '../utils/calculations';
import InvoiceSummary from './InvoiceSummary';
import type { Member, MonthData } from '../types';

interface InvoiceFormProps {
  members: Member[];
  months: Record<string, MonthData>;
  sortedMonths: string[];
  generating: boolean;
  onGenerate: (values: { memberId: string; monthKey: string }) => void;
  onClear: () => void;
}

export default function InvoiceForm({
  members,
  months,
  sortedMonths,
  generating,
  onGenerate,
  onClear,
}: InvoiceFormProps) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [monthKey, setMonthKey] = useState(sortedMonths[sortedMonths.length - 1] ?? '');
  const selectedMonth = months[monthKey];
  const selectedMember = members.find((m) => m.id === memberId);
  const memberTaxas = selectedMonth?.credits?.[memberId]?.taxas ?? 0;
  const hasTaxas = memberTaxas !== 0;

  useEffect(() => {
    if (!memberId || !monthKey || !hasTaxas) {
      onClear();
      return;
    }
    onGenerate({ memberId, monthKey });
  }, [memberId, monthKey, hasTaxas]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Dados da Fatura</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Membro da Família
          </label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Mês de Referência
          </label>
          <select
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          >
            {sortedMonths.map((mk) => (
              <option key={mk} value={mk}>
                {formatMonthLabel(mk)}
              </option>
            ))}
          </select>
        </div>

        {selectedMember && selectedMonth && (
          <InvoiceSummary
            member={selectedMember}
            monthData={selectedMonth}
            monthKey={monthKey}
          />
        )}

        {!hasTaxas && selectedMonth && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
            <strong>Atenção:</strong> Não há taxas cadastradas para este membro neste mês.
            Preencha as taxas da Enel antes de gerar a fatura.
          </div>
        )}

        {generating && (
          <div className="text-sm text-gray-500 text-center py-1">Gerando...</div>
        )}
      </div>
    </div>
  );
}
