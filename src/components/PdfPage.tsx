import { useCallback, useState } from 'react';
import { useAppData } from '../hooks/useAppData';
import {
  copyTextToClipboard,
  formatBulkPixClipboardText,
  generateMemberInvoiceData,
  generateMemberPixData,
} from '../utils/invoiceGeneration';
import InvoiceForm from './InvoiceForm';
import PdfPreviewPanel from './PdfPreviewPanel';
import type { PdfPreview } from '../types';

export default function PdfPage() {
  const { data, isLoading } = useAppData();
  const [generating, setGenerating] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkPixText, setBulkPixText] = useState<string | null>(null);
  const [preview, setPreview] = useState<PdfPreview | null>(null);

  const handleClear = useCallback(() => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  const handleGenerate = useCallback(async (values: { memberId: string; monthKey: string }) => {
    if (!data) return;

    const { members, months, settings } = data;

    try {
      setGenerating(true);
      const member = members.find((m) => m.id === values.memberId);
      const monthData = months[values.monthKey];

      if (!member || !monthData) {
        alert('Membro ou mês não encontrado.');
        return;
      }

      const invoice = await generateMemberInvoiceData(member, monthData, values.monthKey, settings);
      const blob = new Blob([invoice.pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setPreview((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return {
          url,
          filename: invoice.filename,
          member: member.name,
          monthKey: values.monthKey,
          pixPayload: invoice.pixPayload,
        };
      });
    } catch (err) {
      alert('Erro ao gerar PDF: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setGenerating(false);
    }
  }, [data]);

  const handleBulkCopyPix = useCallback(async (monthKey: string) => {
    if (!data) return;

    const { members, months, settings } = data;
    const monthData = months[monthKey];
    if (!monthData) {
      alert('Mês não encontrado.');
      return;
    }

    const membersWithTaxas = members.filter(
      (m) => (monthData.credits?.[m.id]?.taxas ?? 0) !== 0,
    );

    if (membersWithTaxas.length === 0) {
      alert('Nenhum membro com taxas Enel cadastradas neste mês.');
      return;
    }

    try {
      setBulkGenerating(true);
      const results = membersWithTaxas.map((member) =>
        generateMemberPixData(member, monthData, settings),
      );

      const clipboardText = formatBulkPixClipboardText(results);
      const copied = await copyTextToClipboard(clipboardText);
      setBulkPixText(clipboardText);

      if (copied) {
        alert(`Códigos PIX de ${results.length} membros copiados.`);
      } else {
        alert('Use o botão "Copiar PIX" abaixo.');
      }
    } catch (err) {
      alert('Erro ao copiar PIX: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setBulkGenerating(false);
    }
  }, [data]);

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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Gerar Fatura de Créditos Solares</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <div>
          <InvoiceForm
            members={members}
            months={months}
            sortedMonths={sortedMonths}
            settings={settings}
            generating={generating}
            bulkGenerating={bulkGenerating}
            bulkPixText={bulkPixText}
            onGenerate={handleGenerate}
            onBulkCopyPix={handleBulkCopyPix}
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
