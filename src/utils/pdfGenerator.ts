import { PDFDocument, rgb, StandardFonts, type Color } from 'pdf-lib';
import type { Member, MonthData, PixConfig, Settings } from '../types';
import { calculateMemberResults, getEnelBillBreakdown, resolveEnelBaseCostPerKwh, resolveMonthPricing } from './calculations';
import { generatePixQrCodePng } from './pixQrCode';

const COLORS = {
  primary: rgb(0.12, 0.36, 0.58),
  accent: rgb(0.93, 0.62, 0.05),
  dark: rgb(0.15, 0.15, 0.15),
  gray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.85, 0.85, 0.85),
  white: rgb(1, 1, 1),
  green: rgb(0.1, 0.55, 0.25),
  red: rgb(0.75, 0.15, 0.15),
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
  ownerName?: string;
  pix?: PixConfig;
  distributionFeePerKwh?: number;
  gd1DistributionFeePerKwh?: number;
}

/**
 * Generate a PDF invoice for a family member.
 */
export async function generateMemberInvoice({
  member,
  monthData,
  monthKey,
  ownerName = 'Thiago Pereira Maia',
  pix,
  distributionFeePerKwh,
  gd1DistributionFeePerKwh,
}: InvoiceParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const settings: Pick<Settings, 'distributionFeePerKwh'> = {
    distributionFeePerKwh,
  };

  const pricing = resolveMonthPricing(monthData, settings);
  const enelBaseCostPerKwh = resolveEnelBaseCostPerKwh(monthData);
  const credits = monthData.credits?.[member.id] ?? { consumo: 0, taxas: 0 };

  const billing = {
    distributionFeePerKwh,
    gd1DistributionFeePerKwh,
    enelBaseCostPerKwh,
  };

  const result = calculateMemberResults(credits, pricing, billing);
  const enelBill = getEnelBillBreakdown(credits, billing);

  const consumo = result.consumo;
  const consumoNaoCompensado = result.consumoNaoCompensado;
  const taxasEnel = result.taxas;
  const taxasGerais = result.taxasGerais;
  const totalAPagar = result.cobrar;
  const chargedRatePerKwh = result.chargedRatePerKwh;
  const valorCreditos = consumo * chargedRatePerKwh;
  const enelPartCreditos = enelBill.tusdCompensada;
  const isGd1 = credits.gd1 === true;

  const consumoTotal = consumo + consumoNaoCompensado;
  const valorSemDesconto =
    consumoTotal * enelBaseCostPerKwh + taxasGerais;

  const economia = valorSemDesconto - totalAPagar;

  const pctEconomia = valorSemDesconto > 0
    ? ((economia / valorSemDesconto) * 100).toFixed(1).replace('.', ',')
    : '0,0';

  const margin = 50;

  const gap = {
    sectionAfterTitle: 12,
    sectionBreak: 22,
    row: 18,
    rowWithSub: 24,
    subLabelOffset: 13,
    beforeLine: 6,
  };

  let y = height - margin;

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

  const drawLine = (
    yPos: number,
    color: Color = COLORS.lightGray,
  ) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 1,
      color,
    });
  };

  const drawRect = (
    x: number,
    yPos: number,
    w: number,
    h: number,
    color: Color,
  ) => {
    page.drawRectangle({
      x,
      y: yPos,
      width: w,
      height: h,
      color,
    });
  };

  // ── Header ──
  drawRect(
    0,
    height - 80,
    width,
    80,
    COLORS.primary,
  );

  drawText(
    'FATURA DE CRÉDITOS SOLARES',
    margin,
    height - 35,
    {
      size: 20,
      bold: true,
      color: COLORS.white,
    },
  );

  drawText(
    ownerName,
    margin,
    height - 55,
    {
      size: 11,
      color: COLORS.white,
    },
  );

  y = height - 110;

  drawText(
    'CLIENTE',
    margin,
    y,
    {
      size: 8,
      bold: true,
      color: COLORS.gray,
    },
  );

  y -= 16;

  drawText(
    member.name,
    margin,
    y,
    {
      size: 12,
      bold: true,
    },
  );

  y -= 14;

  if (member.address) {
    drawText(
      member.address,
      margin,
      y,
      {
        size: 9,
        color: COLORS.gray,
      },
    );

    y -= 14;
  }

  const rightX = width - margin - 180;

  drawText(
    'REFERENCIA',
    rightX,
    height - 110,
    {
      size: 8,
      bold: true,
      color: COLORS.gray,
    },
  );

  drawText(
    formatMonthLabel(monthKey),
    rightX,
    height - 126,
    {
      size: 12,
      bold: true,
    },
  );

  y -= 8;
  drawLine(y);
  y -= 15;

  // ── Main Amount ──
  drawRect(
    margin,
    y - 16,
    width - 2 * margin,
    50,
    rgb(0.95, 0.97, 1),
  );

  drawText(
    'VALOR A PAGAR',
    margin + 12,
    y + 12,
    {
      size: 10,
      bold: true,
      color: COLORS.primary,
    },
  );

  drawText(
    formatCurrency(totalAPagar),
    width - margin - 130,
    y + 9,
    {
      size: 18,
      bold: true,
      color: COLORS.primary,
    },
  );

  y -= 50;
  y -= 10;

  // ── Invoice Details Table ──
  drawText(
    'DETALHAMENTO DA FATURA',
    margin,
    y,
    {
      size: 11,
      bold: true,
      color: COLORS.primary,
    },
  );

  if (isGd1) {
    drawText(
      'Cobrado como GD1',
      width - margin - 85,
      y + 1,
      {
        size: 7,
        color: COLORS.gray,
      },
    );
  }

  y -= gap.beforeLine;
  drawLine(y, COLORS.primary);
  y -= gap.sectionAfterTitle;

  const colQty = 270;
  const colUnit = 360;
  const colVal = width - margin - 70;

  drawText(
    'Descrição',
    margin,
    y,
    {
      size: 8,
      bold: true,
      color: COLORS.gray,
    },
  );

  drawText(
    'Quantidade',
    colQty,
    y,
    {
      size: 8,
      bold: true,
      color: COLORS.gray,
    },
  );

  drawText(
    'Preço unit.',
    colUnit,
    y,
    {
      size: 8,
      bold: true,
      color: COLORS.gray,
    },
  );

  drawText(
    'Valor',
    colVal,
    y,
    {
      size: 8,
      bold: true,
      color: COLORS.gray,
    },
  );

  y -= gap.beforeLine;
  drawLine(y, COLORS.lightGray);
  y -= gap.row;

  if (consumoNaoCompensado > 0) {
    drawText(
      'Consumo total',
      margin,
      y,
      {
        size: 10,
        bold: true,
      },
    );

    drawText(
      `${consumoTotal} kWh`,
      colQty,
      y,
      {
        size: 10,
        bold: true,
      },
    );

    drawText(
      '—',
      colUnit,
      y,
      {
        size: 9,
        color: COLORS.gray,
      },
    );

    drawText(
      '—',
      colVal,
      y,
      {
        size: 10,
        color: COLORS.gray,
      },
    );

    y -= gap.beforeLine;
    drawLine(y, COLORS.lightGray);
    y -= gap.row;

    const valorNaoCompensado =
      consumoNaoCompensado * enelBaseCostPerKwh;

    drawText(
      'Energia nao compensada',
      margin,
      y,
      {
        size: 10,
        color: COLORS.gray,
      },
    );

    drawText(
      'Mínimo exigido fornecimento próprio Enel',
      margin,
      y - gap.subLabelOffset,
      {
        size: 7,
        color: COLORS.gray,
      },
    );

    drawText(
      `${consumoNaoCompensado} kWh`,
      colQty,
      y,
      {
        size: 10,
        color: COLORS.gray,
      },
    );

    drawText(
      `${formatCurrency(enelBaseCostPerKwh)}/kWh`,
      colUnit,
      y,
      {
        size: 9,
        color: COLORS.gray,
      },
    );

    drawText(
      formatCurrency(valorNaoCompensado),
      colVal,
      y,
      {
        size: 10,
        color: COLORS.gray,
      },
    );

    drawText(
      'Cobrado pela Enel',
      colVal,
      y - gap.subLabelOffset,
      {
        size: 7,
        color: COLORS.red,
      },
    );

    y -= gap.rowWithSub;
    drawLine(y, COLORS.lightGray);
    y -= gap.row;
  }

  drawText(
    'Energia compensada',
    margin,
    y,
    {
      size: 10,
    },
  );

  drawText(
    'Geração solar',
    margin,
    y - gap.subLabelOffset,
    {
      size: 7,
      color: COLORS.gray,
    },
  );

  drawText(
    `${consumo} kWh`,
    colQty,
    y,
    {
      size: 10,
    },
  );

  drawText(
    `${formatCurrency(chargedRatePerKwh)}/kWh`,
    colUnit,
    y,
    {
      size: 9,
    },
  );

  drawText(
    formatCurrency(valorCreditos),
    colVal,
    y,
    {
      size: 10,
    },
  );

  drawText(
    `Parte da Enel: ${formatCurrency(enelPartCreditos)}`,
    colVal,
    y - gap.subLabelOffset,
    {
      size: 7,
      color: COLORS.red,
    },
  );

  y -= gap.rowWithSub;
  drawLine(y, COLORS.lightGray);
  y -= gap.row;

  if (taxasGerais !== 0) {
    drawText(
      'Demais encargos Enel',
      margin,
      y,
      {
        size: 10,
        bold: true,
      },
    );

    drawText(
      'CIP, ilum. publica, etc.',
      colQty,
      y,
      {
        size: 8,
        color: COLORS.gray,
      },
    );

    drawText(
      formatCurrency(taxasGerais),
      colVal,
      y,
      {
        size: 10,
        bold: true,
      },
    );

    y -= gap.beforeLine;
    drawLine(y, COLORS.lightGray);
    y -= gap.row;
  }

   // ── Total ──
  const totalBoxHeight = taxasEnel !== 0 ? 40 : 22;

  drawRect(
    margin,
    y - totalBoxHeight + 15,
    width - 2 * margin,
    totalBoxHeight,
    rgb(0.93, 0.95, 0.98),
  );

  drawText(
    'Total',
    margin + 5,
    y,
    {
      size: 10,
      bold: true,
    },
  );

  drawText(
    formatCurrency(totalAPagar),
    colVal,
    y,
    {
      size: 10,
      bold: true,
    },
  );

  if (taxasEnel !== 0) {
    drawText(
      `Repasse para Enel: ${formatCurrency(enelBill.total)} (Energia + TUSD + encargos)`,
      margin + 5,
      y - 14,
      {
        size: 8,
        color: COLORS.gray,
      },
    );
  }

  y -= totalBoxHeight + 2;

  // ── Savings Comparison ──
  drawText(
    'DEMONSTRATIVO DE ECONOMIA',
    margin,
    y,
    {
      size: 11,
      bold: true,
      color: COLORS.primary,
    },
  );

  y -= gap.beforeLine;
  drawLine(y, COLORS.primary);
  y -= gap.sectionAfterTitle;

  drawText(
    'Tarifa Enel',
    margin,
    y,
    {
      size: 10,
    },
  );

  drawText(
    `${formatCurrency(enelBaseCostPerKwh)}/kWh`,
    colVal,
    y,
    {
      size: 10,
    },
  );

  y -= gap.beforeLine;
  drawLine(y, COLORS.lightGray);
  y -= gap.row;

  drawText(
    'Tarifa solar',
    margin,
    y,
    {
      size: 10,
    },
  );

  drawText(
    `${formatCurrency(chargedRatePerKwh)}/kWh`,
    colVal,
    y,
    {
      size: 10,
    },
  );

  y -= gap.beforeLine;
  drawLine(y, COLORS.lightGray);
  y -= gap.row;

  drawText(
    'Desconto por kWh',
    margin,
    y,
    {
      size: 10,
      color: COLORS.green,
    },
  );

  drawText(
    `${formatCurrency(pricing.discountPerKwh)}/kWh`,
    colVal,
    y,
    {
      size: 10,
      color: COLORS.green,
    },
  );

  y -= gap.beforeLine;
  drawLine(y, COLORS.lightGray);
  y -= gap.row;

  drawText(
    'Valor total SEM creditos solares',
    margin,
    y,
    {
      size: 10,
    },
  );

  drawText(
    `${consumoTotal} kWh x ${formatCurrency(enelBaseCostPerKwh)} + ${formatCurrency(taxasGerais)}`,
    250,
    y,
    {
      size: 8,
      color: COLORS.gray,
    },
  );

  drawText(
    formatCurrency(valorSemDesconto),
    colVal,
    y,
    {
      size: 10,
    },
  );

  y -= gap.beforeLine;
  drawLine(y, COLORS.lightGray);
  y -= gap.row;

  drawText(
    'Valor total COM creditos solares',
    margin,
    y,
    {
      size: 10,
    },
  );

  drawText(
    formatCurrency(totalAPagar),
    colVal,
    y,
    {
      size: 10,
    },
  );

  y -= gap.beforeLine;
  drawLine(y, COLORS.lightGray);

  // ── Economy Summary ──
  y -= 18;

  const economyBoxHeight = 42;

  drawRect(
    margin,
    y - economyBoxHeight,
    width - 2 * margin,
    economyBoxHeight,
    rgb(0.9, 0.97, 0.92),
  );

  drawText(
    'ECONOMIA NO MÊS',
    margin + 10,
    y - 18,
    {
      size: 10,
      bold: true,
      color: COLORS.green,
    },
  );

  drawText(
    `${formatCurrency(economia)} (${pctEconomia}%)`,
    width - margin - 155,
    y - 22,
    {
      size: 16,
      bold: true,
      color: COLORS.green,
    },
  );

  y -= economyBoxHeight + 10;

  // ── PIX Payment QR Code ──
  if (pix && totalAPagar > 0) {
    const qrSize = 120;
    const boxPadding = 12;
    const boxWidth = width - 2 * margin;
    const boxHeight = qrSize + boxPadding * 2;

    drawRect(
      margin,
      y - boxHeight,
      boxWidth,
      boxHeight,
      rgb(0.96, 0.97, 1),
    );

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

    const textX = qrX + qrSize + 20;
    const textStartY = qrY + qrSize - 5;

    drawText(
      'PAGAMENTO VIA PIX',
      textX,
      textStartY,
      {
        size: 12,
        bold: true,
        color: COLORS.primary,
      },
    );

    drawText(
      'Escaneie o QR Code ao lado com o',
      textX,
      textStartY - 20,
      {
        size: 9,
        color: COLORS.gray,
      },
    );

    drawText(
      'aplicativo do seu banco.',
      textX,
      textStartY - 32,
      {
        size: 9,
        color: COLORS.gray,
      },
    );

    drawText(
      'Valor:',
      textX,
      textStartY - 52,
      {
        size: 9,
        bold: true,
        color: COLORS.dark,
      },
    );

    drawText(
      formatCurrency(totalAPagar),
      textX + 35,
      textStartY - 52,
      {
        size: 11,
        bold: true,
        color: COLORS.primary,
      },
    );

    drawText(
      `Chave: ${pix.key}`,
      textX,
      textStartY - 70,
      {
        size: 7,
        color: COLORS.gray,
      },
    );

    drawText(
      `Beneficiario: ${pix.merchantName}`,
      textX,
      textStartY - 82,
      {
        size: 7,
        color: COLORS.gray,
      },
    );

    y -= boxHeight + 12;
  }

  return pdfDoc.save();
}
