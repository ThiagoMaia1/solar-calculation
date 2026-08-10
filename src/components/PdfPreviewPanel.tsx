import { useRef, useState, useEffect, useCallback } from 'react';
import { copyTextToClipboard } from '../utils/invoiceGeneration';
import { formatMonthLabel } from '../utils/calculations';
import type { PdfPreview } from '../types';

type CopyState = 'idle' | 'copied' | 'error';

interface PdfPreviewPanelProps {
  preview: PdfPreview | null;
}

export default function PdfPreviewPanel({ preview }: PdfPreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeHeight, setIframeHeight] = useState(400);

  const updateHeight = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Available height = container height minus header bar (~44px for member name + download btn + margin)
    const available = rect.height - 44;
    setIframeHeight(Math.max(available, 200));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(el);
    updateHeight();

    return () => observer.disconnect();
  }, [updateHeight]);

  const [copyState, setCopyState] = useState<CopyState>('idle');

  const handleDownload = () => {
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview.url;
    a.download = preview.filename;
    a.click();
  };

  const handleCopyPix = async () => {
    if (!preview?.pixPayload) return;
    const copied = await copyTextToClipboard(preview.pixPayload);
    setCopyState(copied ? 'copied' : 'error');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow p-6 flex flex-col flex-1 min-h-0 overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Visualização</h2>

      {preview ? (
        <div className="flex flex-col min-h-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{preview.member}</span> —{' '}
              {formatMonthLabel(preview.monthKey)}
            </p>
            <div className="flex items-center gap-2 ml-4">
              {preview.pixPayload && (
                <button
                  onClick={handleCopyPix}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                    copyState === 'copied'
                      ? 'bg-emerald-500 text-white'
                      : copyState === 'error'
                        ? 'bg-red-500 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copyState === 'copied'
                    ? '✓ Copiado!'
                    : copyState === 'error'
                      ? '✗ Erro'
                      : '📋 Copiar PIX'}
                </button>
              )}
              <button
                onClick={handleDownload}
                className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                ⬇ Download
              </button>
            </div>
          </div>
          <iframe
            src={`${preview.url}#toolbar=0&navpanes=0`}
            style={{ height: iframeHeight }}
            className="w-full border border-gray-200 rounded"
            title="PDF Preview"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 p-4">
          <p className="text-gray-400 text-sm">
            Selecione um membro e mês para visualizar a fatura
          </p>
        </div>
      )}
    </div>
  );
}
