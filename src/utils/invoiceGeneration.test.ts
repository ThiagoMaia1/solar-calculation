import { describe, it, expect } from 'vitest';
import { formatBulkPixClipboardText } from './invoiceGeneration';
import type { MemberInvoiceResult } from './invoiceGeneration';

describe('formatBulkPixClipboardText', () => {
  it('formats name and pix payload blocks separated by blank lines', () => {
    const results = [
      {
        member: { id: 'a', name: 'João', address: '' },
        pixPayload: 'PIX-A',
      },
      {
        member: { id: 'b', name: 'Maria', address: '' },
        pixPayload: 'PIX-B',
      },
    ] as MemberInvoiceResult[];

    expect(formatBulkPixClipboardText(results)).toBe(
      'João:\nPIX-A\n\nMaria:\nPIX-B',
    );
  });
});
