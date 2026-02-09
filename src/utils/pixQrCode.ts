import QRCode from 'qrcode';

/**
 * Build a PIX static QR Code payload (EMV format).
 *
 * Reference: Banco Central do Brasil – Manual de Padrões para Iniciação do PIX
 * https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 */

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  const polynomial = 0x1021;
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

interface PixPayloadParams {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txId?: string;
}

export function buildPixPayload({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  txId = '***',
}: PixPayloadParams): string {
  // Normalize: remove accents, uppercase, max lengths per spec
  const name = merchantName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .substring(0, 25);
  const city = merchantCity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .substring(0, 15);

  const merchantAccountInfo =
    tlv('00', 'br.gov.bcb.pix') + tlv('01', pixKey);

  const additionalData = tlv('05', txId);

  let payload = '';
  payload += tlv('00', '01');                              // Payload Format Indicator
  payload += tlv('26', merchantAccountInfo);               // Merchant Account Information
  payload += tlv('52', '0000');                            // Merchant Category Code
  payload += tlv('53', '986');                             // Transaction Currency (BRL)
  payload += tlv('54', amount.toFixed(2));                 // Transaction Amount
  payload += tlv('58', 'BR');                              // Country Code
  payload += tlv('59', name);                              // Merchant Name
  payload += tlv('60', city);                              // Merchant City
  payload += tlv('62', additionalData);                    // Additional Data Field

  // CRC placeholder – ID 63, length 04, then compute CRC over the whole string
  payload += '6304';
  payload += crc16(payload);

  return payload;
}

/**
 * Generate a PIX QR code as a PNG data URL.
 */
export async function generatePixQrCodePng(
  params: PixPayloadParams,
): Promise<Uint8Array> {
  const payload = buildPixPayload(params);

  // Generate QR code as a data URL (PNG), then convert to Uint8Array
  const dataUrl: string = await QRCode.toDataURL(payload, {
    type: 'image/png',
    width: 300,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#1E5C94', light: '#FFFFFF' },
  });

  // Strip the data URL prefix and decode base64
  const base64 = dataUrl.split(',')[1]!;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
