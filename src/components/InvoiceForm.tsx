import { useEffect, useState } from 'react';
import { copyTextToClipboard } from '../utils/invoiceGeneration';
import { formatMonthLabel } from '../utils/calculations';
import InvoiceSummary from './InvoiceSummary';
import type { Member, MonthData, Settings } from '../types';

interface InvoiceFormProps {
  members: Member[];
  months: Record<string, MonthData>;
  sortedMonths: string[];
  settings: Settings;
  generating: boolean;
  bulkGenerating: boolean;
  bulkPixText: string | null;
  onGenerate: (values: { memberId: string; monthKey: string }) => void;
  onBulkCopyPix: (monthKey: string) => void;
  onClear: () => void;
}

export default function InvoiceForm({
  members,
  months,
  sortedMonths,
  settings,
  generating,
  bulkGenerating,
  bulkPixText,
  onGenerate,
  onBulkCopyPix,
  onClear,
}: InvoiceFormProps) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [monthKey, setMonthKey] = useState(sortedMonths[sortedMonths.length - 1] ?? '');
  const [pixCopyState, setPixCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const selectedMonth = months[monthKey];
  const selectedMember = members.find((m) => m.id === memberId);
  const memberTaxas = selectedMonth?.credits?.[memberId]?.taxas ?? 0;
  const hasTaxas = memberTaxas !== 0;
  const membersWithTaxasInMonth = members.filter(
    (m) => (selectedMonth?.credits?.[m.id]?.taxas ?? 0) !== 0,
  );
  const canBulkGenerate = Boolean(monthKey && membersWithTaxasInMonth.length > 0);

  useEffect(() => {
    if (!memberId || !monthKey || !hasTaxas) {
      onClear();
      return;
    }
    onGenerate({ memberId, monthKey });
  }, [memberId, monthKey, hasTaxas]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopyBulkPix = async () => {
    if (!bulkPixText) return;
    const copied = await copyTextToClipboard(bulkPixText);
    setPixCopyState(copied ? 'copied' : 'error');
    setTimeout(() => setPixCopyState('idle'), 2000);
  };

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
            settings={settings}
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

        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            disabled={!canBulkGenerate || bulkGenerating || generating}
            onClick={() => onBulkCopyPix(monthKey)}
            className="w-full px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {bulkGenerating
              ? 'Copiando PIX...'
              : `Copiar PIX de todos (${membersWithTaxasInMonth.length})`}
          </button>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Copia os códigos PIX de todos os membros com taxas no mês selecionado.
          </p>

          {bulkPixText && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-700">Códigos PIX</p>
                <button
                  type="button"
                  onClick={handleCopyBulkPix}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    pixCopyState === 'copied'
                      ? 'bg-emerald-500 text-white'
                      : pixCopyState === 'error'
                        ? 'bg-red-500 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {pixCopyState === 'copied'
                    ? 'Copiado!'
                    : pixCopyState === 'error'
                      ? 'Erro ao copiar'
                      : 'Copiar PIX'}
                </button>
              </div>
              <textarea
                readOnly
                value={bulkPixText}
                rows={8}
                className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg bg-gray-50 resize-y"
                onFocus={(e) => e.target.select()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
