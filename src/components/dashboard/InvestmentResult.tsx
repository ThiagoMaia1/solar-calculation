import { formatBRL } from '../../utils/calculations';
import { useCDI, compoundCDI } from '../../hooks/useCDI';

interface InvestmentResultProps {
  /** Initial equipment investment */
  totalInvestment: number;
  /** Sum of all monthly resultadoMes */
  accumulatedResult: number;
  /** Start date of the investment (YYYY-MM) */
  startDate: string;
  /** Latest month key (YYYY-MM) */
  latestMonthKey: string;
}

export function InvestmentResult({
  totalInvestment,
  accumulatedResult,
  startDate,
  latestMonthKey,
}: InvestmentResultProps) {
  const { data: cdiEntries, isLoading: cdiLoading, error: cdiError } = useCDI(startDate, latestMonthKey);

  const solarROI = (accumulatedResult / totalInvestment) * 100;

  // CDI calculation
  let cdiReturn: number | null = null;
  let cdiROI: number | null = null;
  if (cdiEntries && cdiEntries.length > 0) {
    const cdiEndValue = compoundCDI(cdiEntries, totalInvestment);
    cdiReturn = cdiEndValue - totalInvestment;
    cdiROI = ((cdiEndValue - totalInvestment) / totalInvestment) * 100;
  }

  const solarBeatsCDI = cdiROI !== null && solarROI > cdiROI;
  const diff = cdiROI !== null ? solarROI - cdiROI : null;

  return (
    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-violet-500">
      <p className="text-xs text-gray-500 uppercase">Resultado do Investimento</p>

      {/* Solar result */}
      <p className={`text-lg font-bold mt-1 ${accumulatedResult >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
        {formatBRL(accumulatedResult)}
      </p>
      <p className="text-xs text-gray-500">
        ROI Solar: <span className={`font-semibold ${solarROI >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {solarROI.toFixed(2)}%
        </span>
      </p>

      {/* CDI comparison */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        {cdiLoading && (
          <p className="text-xs text-gray-400">Carregando CDI...</p>
        )}
        {cdiError && (
          <p className="text-xs text-red-400">Erro ao buscar CDI</p>
        )}
        {cdiReturn !== null && cdiROI !== null && (
          <>
            <p className="text-xs text-gray-500">
              Se fosse CDI: <span className="font-semibold text-gray-700">{formatBRL(cdiReturn)}</span>
              {' '}
              <span className="text-gray-400">({cdiROI.toFixed(2)}%)</span>
            </p>
            <p className={`text-xs font-semibold mt-0.5 ${solarBeatsCDI ? 'text-emerald-600' : 'text-red-500'}`}>
              {solarBeatsCDI ? '▲' : '▼'} {diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)}pp vs CDI` : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
