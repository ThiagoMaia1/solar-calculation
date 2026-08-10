import type { Member, MonthData, Settings } from '../types';
import { calculateMemberResults, resolveEnelBaseCostPerKwh, resolveMonthPricing } from './calculations';
import { generateMemberInvoice } from './pdfGenerator';
import { buildPixPayload } from './pixQrCode';

export interface MemberInvoiceResult {
  member: Member;
  pdfBytes: Uint8Array;
  filename: string;
  pixPayload?: string;
  totalAPagar: number;
}

function getBillingOptions(settings: Settings, monthData: MonthData) {
  return {
    distributionFeePerKwh: settings.distributionFeePerKwh,
    gd1DistributionFeePerKwh: settings.gd1DistributionFeePerKwh,
    enelBaseCostPerKwh: resolveEnelBaseCostPerKwh(monthData),
  };
}

function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildMemberPixEntry(
  member: Member,
  monthData: MonthData,
  settings: Settings,
): Pick<MemberInvoiceResult, 'member' | 'pixPayload' | 'totalAPagar'> {
  const credits = monthData.credits?.[member.id] ?? { consumo: 0, taxas: 0 };
  const pricing = resolveMonthPricing(monthData, settings);
  const { cobrar: totalAPagar } = calculateMemberResults(
    credits,
    pricing,
    getBillingOptions(settings, monthData),
  );

  let pixPayload: string | undefined;
  if (settings.pix && totalAPagar > 0) {
    pixPayload = buildPixPayload({
      pixKey: settings.pix.key,
      merchantName: settings.pix.merchantName,
      merchantCity: settings.pix.merchantCity,
      amount: totalAPagar,
    });
  }

  return { member, pixPayload, totalAPagar };
}

export async function generateMemberInvoiceData(
  member: Member,
  monthData: MonthData,
  monthKey: string,
  settings: Settings,
): Promise<MemberInvoiceResult> {
  const distributionFeePerKwh =
    settings.distributionFeePerKwh ??
    (settings as unknown as Record<string, unknown>).estimatedTaxPerKwh as number | undefined;

  const pdfBytes = await generateMemberInvoice({
    member,
    monthData,
    monthKey,
    pix: settings.pix,
    distributionFeePerKwh,
    gd1DistributionFeePerKwh: settings.gd1DistributionFeePerKwh,
  });

  const { pixPayload, totalAPagar } = buildMemberPixEntry(member, monthData, settings);

  return {
    member,
    pdfBytes,
    filename: `fatura-${slugifyName(member.name)}-${monthKey}.pdf`,
    pixPayload,
    totalAPagar,
  };
}

export function generateMemberPixData(
  member: Member,
  monthData: MonthData,
  settings: Settings,
): Pick<MemberInvoiceResult, 'member' | 'pixPayload' | 'totalAPagar'> {
  return buildMemberPixEntry(member, monthData, settings);
}

export function formatBulkPixClipboardText(
  results: Pick<MemberInvoiceResult, 'member' | 'pixPayload'>[],
): string {
  return results
    .map(({ member, pixPayload }) =>
      pixPayload ? `${member.name}:\n${pixPayload}` : `${member.name}:\n`,
    )
    .join('\n\n');
}

/** Copy text with Clipboard API, falling back to execCommand for async flows. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy copy
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function downloadPdfBytes(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
