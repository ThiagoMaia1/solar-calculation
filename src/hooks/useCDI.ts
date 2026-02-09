import { useQuery } from '@tanstack/react-query';

interface CDIEntry {
  data: string;   // "DD/MM/YYYY"
  valor: string;  // monthly rate as percentage, e.g. "0.97"
}

/**
 * Fetch monthly CDI rates from the Brazilian Central Bank (BCB) API.
 * Series 4391 = CDI accumulated monthly rate (% per month).
 *
 * @param startDate YYYY-MM format
 * @param endDate   YYYY-MM format (defaults to current month)
 */
export function useCDI(startDate: string | undefined, endDate: string | undefined) {
  return useQuery<CDIEntry[]>({
    queryKey: ['cdi', startDate, endDate],
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 60, // 1 hour
    queryFn: async () => {
      if (!startDate || !endDate) return [];

      const [sY, sM] = startDate.split('-');
      const [eY, eM] = endDate.split('-');
      const from = `01/${sM}/${sY}`;
      const to = `01/${eM}/${eY}`;

      const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados?formato=json&dataInicial=${from}&dataFinal=${to}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`BCB API error: ${res.status}`);
      const data: CDIEntry[] = await res.json();
      return data;
    },
  });
}

/**
 * Given CDI monthly entries and an initial amount, compound the CDI returns.
 * Returns the final value after compounding.
 */
export function compoundCDI(entries: CDIEntry[], principal: number): number {
  let value = principal;
  for (const entry of entries) {
    const rate = parseFloat(entry.valor) / 100; // convert percentage to decimal
    value *= 1 + rate;
  }
  return value;
}
