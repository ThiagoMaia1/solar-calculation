import { useCallback, useState } from 'react';
import { useAppData } from '../hooks/useAppData';
import { generateMemberInvoice } from '../utils/pdfGenerator';
import { buildPixPayload } from '../utils/pixQrCode';
import InvoiceForm from './InvoiceForm';
import PdfPreviewPanel from './PdfPreviewPanel';
import type { PdfPreview } from '../types';

export default function PdfPage() {
  const { data, isLoading } = useAppData();
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<PdfPreview | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Carregando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Erro ao carregar dados. Verifique as configurações do JSONBin.
      </div>
    );
  }

  const { members, months, settings } = data;
  const sortedMonths = Object.keys(months).sort();

  const handleClear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }, [preview]);

  const handleGenerate = async (values: { memberId: string; monthKey: string }) => {
    try {
      setGenerating(true);
      const member = members.find((m) => m.id === values.memberId);
      const monthData = months[values.monthKey];

      if (!member || !monthData) {
        alert('Membro ou mês não encontrado.');
        return;
      }

      const pdfBytes = await generateMemberInvoice({
        member,
        monthData,
        monthKey: values.monthKey,
        enelTariff: settings.enelTariff,
        pix: settings.pix,
        distributionFeePerKwh: settings.distributionFeePerKwh ?? (settings as unknown as Record<string, unknown>).estimatedTaxPerKwh as number | undefined,
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Build PIX copia-e-cola payload if pix is configured
      let pixPayload: string | undefined;
      if (settings.pix) {
        const credits = monthData.credits?.[member.id] ?? { consumo: 0, taxas: 0 };
        const energyValue = monthData.energyValue ?? 0;
        const totalAPagar = credits.consumo * energyValue + credits.taxas;
        if (totalAPagar > 0) {
          pixPayload = buildPixPayload({
            pixKey: settings.pix.key,
            merchantName: settings.pix.merchantName,
            merchantCity: settings.pix.merchantCity,
            amount: totalAPagar,
          });
        }
      }

      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({
        url,
        filename: `fatura-${member.name.toLowerCase()}-${values.monthKey}.pdf`,
        member: member.name,
        monthKey: values.monthKey,
        pixPayload,
      });
    } catch (err) {
      alert('Erro ao gerar PDF: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Gerar Fatura de Créditos Solares</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <div>
          <InvoiceForm
            members={members}
            months={months}
            sortedMonths={sortedMonths}
            generating={generating}
            onGenerate={handleGenerate}
            onClear={handleClear}
          />
        </div>

        <div className="flex flex-col min-h-0">
          <PdfPreviewPanel preview={preview} />
        </div>
      </div>
    </div>
  );
}
