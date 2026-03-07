import { PDFDocument, rgb, StandardFonts, type Color } from 'pdf-lib';
import type { Member, MonthData, PixConfig } from '../types';
import { generatePixQrCodePng } from './pixQrCode';

const COLORS = {
  primary: rgb(0.12, 0.36, 0.58),
  accent: rgb(0.93, 0.62, 0.05),
  dark: rgb(0.15, 0.15, 0.15),
  gray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.85, 0.85, 0.85),
  white: rgb(1, 1, 1),
  green: rgb(0.1, 0.55, 0.25),
} as const;

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${months[parseInt(month!, 10) - 1]}/${year}`;
}

interface DrawTextOptions {
  size?: number;
  bold?: boolean;
  color?: Color;
}

interface InvoiceParams {
  member: Member;
  monthData: MonthData;
  monthKey: string;
  enelTariff: number;
  ownerName?: string;
  pix?: PixConfig;
  /** Estimated variable tax per kWh (ICMS/PIS/COFINS on Enel bill with solar) */
  estimatedTaxPerKwh?: number;
}

/**
 * Generate a PDF invoice for a family member.
 */
export async function generateMemberInvoice({
  member,
  monthData,
  monthKey,
  enelTariff,
  ownerName = 'Thiago Pereira Maia',
  pix,
  estimatedTaxPerKwh,
}: InvoiceParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const energyValue = monthData.energyValue ?? 0;
  const credits = monthData.credits?.[member.id] ?? { consumo: 0, taxas: 0 };
  const consumo = credits.consumo ?? 0;
  const taxas = credits.taxas ?? 0;
  const valorCreditos = consumo * energyValue;
  const totalAPagar = valorCreditos + taxas;

  const taxPerKwh = estimatedTaxPerKwh ?? 0;
  const impostosConsumo = Math.min(consumo * taxPerKwh, taxas);
  const taxasGerais = taxas - impostosConsumo;
  const valorSemDesconto = taxas + consumo * (enelTariff - taxPerKwh);
  const economia = valorSemDesconto - totalAPagar;

  const margin = 50;
  let y = height - margin;

  // ── Helper functions ──
  const drawText = (
    text: string,
    x: number,
    yPos: number,
    options: DrawTextOptions = {},
  ) => {
    page.drawText(String(text), {
      x,
      y: yPos,
      size: options.size ?? 10,
      font: options.bold ? bold : font,
      color: options.color ?? COLORS.dark,
    });
  };

  const drawLine = (yPos: number, color: Color = COLORS.lightGray) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 1,
      color,
    });
  };

  const drawRect = (x: number, yPos: number, w: number, h: number, color: Color) => {
    page.drawRectangle({ x, y: yPos, width: w, height: h, color });
  };

  // ── Header ──
  drawRect(0, height - 80, width, 80, COLORS.primary);
  drawText('FATURA DE CREDITOS SOLARES', margin, height - 35, {
    size: 20, bold: true, color: COLORS.white,
  });
  drawText(ownerName, margin, height - 55, {
    size: 11, color: COLORS.white,
  });

  y = height - 110;

  // ── Client info + invoice details ──
  drawText('CLIENTE', margin, y, { size: 8, bold: true, color: COLORS.gray });
  y -= 16;
  drawText(member.name, margin, y, { size: 12, bold: true });
  y -= 14;
  if (member.address) {
    drawText(member.address, margin, y, { size: 9, color: COLORS.gray });
    y -= 14;
  }

  // Right side: invoice info
  const rightX = width - margin - 180;
  drawText('REFERENCIA', rightX, height - 110, {
    size: 8, bold: true, color: COLORS.gray,
  });
  drawText(formatMonthLabel(monthKey), rightX, height - 126, {
    size: 12, bold: true,
  });

  y -= 10;
  drawLine(y);
  y -= 25;

  // ── Main Amount ──
  drawRect(margin, y - 10, width - 2 * margin, 40, rgb(0.95, 0.97, 1));
  drawText('VALOR A PAGAR', margin + 10, y + 10, {
    size: 10, bold: true, color: COLORS.primary,
  });
  drawText(formatCurrency(totalAPagar), width - margin - 130, y + 8, {
    size: 18, bold: true, color: COLORS.primary,
  });

  y -= 40;
  y -= 20;

  // ── Invoice Details Table ──
  drawText('DETALHAMENTO DA FATURA', margin, y, {
    size: 11, bold: true, color: COLORS.primary,
  });
  y -= 5;
  drawLine(y, COLORS.primary);
  y -= 20;

  // Table header
  drawText('Descricao', margin, y, { size: 8, bold: true, color: COLORS.gray });
  drawText('Quantidade', 300, y, { size: 8, bold: true, color: COLORS.gray });
  drawText('Valor', width - margin - 80, y, { size: 8, bold: true, color: COLORS.gray });
  y -= 5;
  drawLine(y, COLORS.lightGray);
  y -= 18;

  // Row: energy credits
  drawText('Energia compensada (creditos solares)', margin, y, { size: 10 });
  drawText(`${consumo} kWh`, 300, y, { size: 10 });
  drawText(formatCurrency(valorCreditos), width - margin - 80, y, { size: 10 });
  y -= 5;
  drawLine(y, COLORS.lightGray);
  y -= 18;

  // Rows: Enel taxes (estimated breakdown)
  if (taxas !== 0) {
    if (estimatedTaxPerKwh && consumo > 0) {
      const impostosConsumo = Math.min(consumo * estimatedTaxPerKwh, taxas);
      const taxasGerais = taxas - impostosConsumo;

      // Row: variable taxes (ICMS/PIS/COFINS)
      drawText('Impostos sobre consumo (est.)', margin, y, { size: 10 });
      drawText(`${consumo} kWh x ${formatCurrency(estimatedTaxPerKwh)}`, 260, y, {
        size: 8, color: COLORS.gray,
      });
      drawText(formatCurrency(impostosConsumo), width - margin - 80, y, { size: 10 });
      y -= 5;
      drawLine(y, COLORS.lightGray);
      y -= 18;

      // Row: fixed taxes (CIP, iluminação pública, etc.)
      if (taxasGerais > 0) {
        drawText('Taxas gerais Enel (est.)', margin, y, { size: 10 });
        drawText('CIP, ilum. publica, etc.', 260, y, {
          size: 8, color: COLORS.gray,
        });
        drawText(formatCurrency(taxasGerais), width - margin - 80, y, { size: 10 });
        y -= 5;
        drawLine(y, COLORS.lightGray);
        y -= 18;
      }
    } else {
      // Fallback: single line if no estimate available
      drawText('Taxas da Enel', margin, y, { size: 10 });
      drawText(formatCurrency(taxas), width - margin - 80, y, { size: 10 });
      y -= 5;
      drawLine(y, COLORS.lightGray);
      y -= 18;
    }
  }

  // Total row
  drawRect(margin, y - 5, width - 2 * margin, 22, rgb(0.93, 0.95, 0.98));
  drawText('Total', margin + 5, y, { size: 10, bold: true });
  drawText(formatCurrency(totalAPagar), width - margin - 80, y, {
    size: 10, bold: true,
  });

  y -= 45;

  // ── Savings Comparison ──
  drawText('DEMONSTRATIVO DE ECONOMIA', margin, y, {
    size: 11, bold: true, color: COLORS.primary,
  });
  y -= 5;
  drawLine(y, COLORS.primary);
  y -= 20;

  // Without solar
  drawText('Valor SEM creditos solares (tarifa Enel)', margin, y, { size: 10 });
  drawText(`${consumo} kWh x ${formatCurrency(enelTariff - taxPerKwh)} + ${formatCurrency(taxas)}`, 250, y, {
    size: 8, color: COLORS.gray,
  });
  drawText(formatCurrency(valorSemDesconto), width - margin - 80, y, { size: 10 });
  y -= 5;
  drawLine(y, COLORS.lightGray);
  y -= 18;

  // With solar
  drawText('Valor COM creditos solares', margin, y, { size: 10 });
  drawText(formatCurrency(totalAPagar), width - margin - 80, y, { size: 10 });
  y -= 5;
  drawLine(y, COLORS.lightGray);
  y -= 25;

  // Savings highlight
  drawRect(margin, y - 8, width - 2 * margin, 35, rgb(0.9, 0.97, 0.92));
  drawText('ECONOMIA NO MES', margin + 10, y + 8, {
    size: 10, bold: true, color: COLORS.green,
  });
  drawText(formatCurrency(economia), width - margin - 110, y + 5, {
    size: 16, bold: true, color: COLORS.green,
  });

  y -= 60;

  // ── PIX Payment QR Code ──
  if (pix && totalAPagar > 0) {
    const qrSize = 120;
    const boxPadding = 12;
    const boxWidth = width - 2 * margin;
    const boxHeight = qrSize + boxPadding * 2;

    drawRect(margin, y - boxHeight, boxWidth, boxHeight, rgb(0.96, 0.97, 1));

    // Border
    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderColor: COLORS.primary,
      borderWidth: 1,
      color: rgb(0.96, 0.97, 1),
    });

    const qrX = margin + boxPadding;
    const qrY = y - boxHeight + boxPadding;

    // Generate and embed QR code
    const qrPngBytes = await generatePixQrCodePng({
      pixKey: pix.key,
      merchantName: pix.merchantName,
      merchantCity: pix.merchantCity,
      amount: totalAPagar,
    });

    const qrImage = await pdfDoc.embedPng(qrPngBytes);
    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Text beside the QR code
    const textX = qrX + qrSize + 20;
    const textStartY = qrY + qrSize - 5;

    drawText('PAGAMENTO VIA PIX', textX, textStartY, {
      size: 12, bold: true, color: COLORS.primary,
    });
    drawText('Escaneie o QR Code ao lado com o', textX, textStartY - 20, {
      size: 9, color: COLORS.gray,
    });
    drawText('aplicativo do seu banco.', textX, textStartY - 32, {
      size: 9, color: COLORS.gray,
    });

    drawText('Valor:', textX, textStartY - 52, {
      size: 9, bold: true, color: COLORS.dark,
    });
    drawText(formatCurrency(totalAPagar), textX + 35, textStartY - 52, {
      size: 11, bold: true, color: COLORS.primary,
    });

    drawText(`Chave: ${pix.key}`, textX, textStartY - 70, {
      size: 7, color: COLORS.gray,
    });
    drawText(`Beneficiario: ${pix.merchantName}`, textX, textStartY - 82, {
      size: 7, color: COLORS.gray,
    });

    y -= boxHeight + 25;
  }

  // ── Calculation details ──
  drawText('CALCULO', margin, y, { size: 9, bold: true, color: COLORS.gray });
  y -= 15;
  drawText(`Consumo: ${consumo} kWh`, margin, y, {
    size: 8, color: COLORS.gray,
  });
  y -= 12;
  drawText(`Valor por kWh (creditos solares): ${formatCurrency(energyValue)}`, margin, y, {
    size: 8, color: COLORS.gray,
  });
  y -= 12;
  drawText(`Tarifa Enel (referencia): ${formatCurrency(enelTariff)}/kWh`, margin, y, {
    size: 8, color: COLORS.gray,
  });
  y -= 12;
  const pctEconomia = valorSemDesconto > 0
    ? ((economia / valorSemDesconto) * 100).toFixed(1)
    : '0.0';
  drawText(`Percentual de economia: ${pctEconomia}%`, margin, y, {
    size: 8, color: COLORS.gray,
  });

  // ── Footer ──
  drawLine(margin + 30, COLORS.lightGray);
  drawText(
    'Fatura gerada automaticamente - Solar Credits Management',
    margin,
    margin + 15,
    { size: 7, color: COLORS.gray },
  );

  return pdfDoc.save();
}
