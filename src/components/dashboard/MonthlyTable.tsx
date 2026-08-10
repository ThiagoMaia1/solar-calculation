import { useState } from 'react';
import { formatMonthLabel } from '../../utils/calculations';
import { SectionHeader, MemberSubHeader } from './SectionHeaders';
import { ReadOnlyDataRow, EditableDataRow } from './DataRows';
import type { ComputedMonthValues, Member } from '../../types';

const RECENT_MONTHS_COUNT = 6;

interface MonthlyTableProps {
  sortedMonthKeys: string[];
  monthValues: ComputedMonthValues[];
  members: Member[];
  colSpan: number;
  onEditMonth: (monthKey: string) => void;
  onDeleteMonth: (monthKey: string) => void;
  onCellEdit: (monthKey: string, fieldPath: string, newValue: number) => void;
}

export function MonthlyTable({
  sortedMonthKeys,
  monthValues,
  members,
  onEditMonth,
  onDeleteMonth,
  onCellEdit,
}: MonthlyTableProps) {
  const hasOtherExpenses = monthValues.some(
    (v) => v.costs.trocaTitularidade !== 0 || v.costs.taxasEconomy !== 0,
  );
  const [showOtherExpenses, setShowOtherExpenses] = useState(hasOtherExpenses);
  const [showAllMonths, setShowAllMonths] = useState(false);

  const canCollapseMonths = sortedMonthKeys.length > RECENT_MONTHS_COUNT;
  const visibleMonthKeys =
    showAllMonths || !canCollapseMonths
      ? sortedMonthKeys
      : sortedMonthKeys.slice(-RECENT_MONTHS_COUNT);
  const visibleMonthValues =
    showAllMonths || !canCollapseMonths
      ? monthValues
      : monthValues.slice(-RECENT_MONTHS_COUNT);
  const visibleColSpan = visibleMonthKeys.length + 1;
  const hiddenMonthCount = sortedMonthKeys.length - RECENT_MONTHS_COUNT;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden h-full flex flex-col">
      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-30">
            <tr className="bg-gray-800 text-white">
              <th className="sticky left-0 z-40 bg-gray-800 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider min-w-[200px]">
                {canCollapseMonths && (
                  <button
                    onClick={() => setShowAllMonths((v) => !v)}
                    className="text-amber-300 hover:text-amber-200 font-medium normal-case tracking-normal flex items-center gap-1"
                  >
                    <span className={`transition-transform inline-block ${showAllMonths ? 'rotate-90' : ''}`}>▶</span>
                    {showAllMonths
                      ? 'Ocultar meses anteriores'
                      : `Mostrar ${hiddenMonthCount} ${hiddenMonthCount === 1 ? 'mês anterior' : 'meses anteriores'}`}
                  </button>
                )}
              </th>
              {visibleMonthKeys.map((mk) => (
                <th
                  key={mk}
                  className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[130px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{formatMonthLabel(mk)}</span>
                    <button
                      onClick={() => onEditMonth(mk)}
                      className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDeleteMonth(mk)}
                      className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity"
                      title="Deletar"
                    >
                      🗑️
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ── Valores ── */}
            <SectionHeader label="Valores" colSpan={visibleColSpan} />
            <ReadOnlyDataRow
              label="Inversor c/ Depreciação"
              values={visibleMonthValues.map((v) => v.equipDep.inversor)}
              isComputed
            />
            <ReadOnlyDataRow
              label="Placas c/ Depreciação"
              values={visibleMonthValues.map((v) => v.equipDep.placas)}
              isComputed
            />
            <EditableDataRow
              label="Tarifa base Enel"
              values={visibleMonthValues.map((v) => v.enelBaseCostPerKwh)}
              monthKeys={visibleMonthKeys}
              fieldPath="enelBaseCostPerKwh"
              format="currency4"
              tooltip="Tarifa Enel all-in do mês (TE + TUSD + impostos)"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Desconto sobre tarifa base"
              values={visibleMonthValues.map((v) => v.discountPerKwh)}
              monthKeys={visibleMonthKeys}
              fieldPath="discountPerKwh"
              format="currency4"
              onCellEdit={onCellEdit}
            />
            <ReadOnlyDataRow
              label="Valor kwh (Distribuição + produção)"
              values={visibleMonthValues.map((v) => v.chargedRatePerKwh)}
              format="currency4"
              isComputed
              tooltip="Tarifa all-in incluindo distribuicao (Enel - desconto)"
            />
            <ReadOnlyDataRow
              label="Margem interna"
              values={visibleMonthValues.map((v) => v.profitPerKwh)}
              format="currency4"
              isComputed
              tooltip="Margem apos distribuicao — nao aparece na fatura"
            />

            {/* ── Custos ── */}
            <SectionHeader label="Custos" colSpan={visibleColSpan} />
            <ReadOnlyDataRow
              label="Depreciação Inversor"
              values={visibleMonthValues.map((v) => v.costs.depreciacaoInversor)}
              isComputed
            />
            <ReadOnlyDataRow
              label="Depreciação Placas"
              values={visibleMonthValues.map((v) => v.costs.depreciacaoPlacas)}
              isComputed
            />
            <EditableDataRow
              label="Internet"
              values={visibleMonthValues.map((v) => v.costs.internet)}
              monthKeys={visibleMonthKeys}
              fieldPath="costs.internet"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Seguro"
              values={visibleMonthValues.map((v) => v.costs.seguro)}
              monthKeys={visibleMonthKeys}
              fieldPath="costs.seguro"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Iluminação Pública"
              values={visibleMonthValues.map((v) => v.costs.iluminacaoPublica)}
              monthKeys={visibleMonthKeys}
              fieldPath="costs.iluminacaoPublica"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Vigilante"
              values={visibleMonthValues.map((v) => v.costs.vigilante)}
              monthKeys={visibleMonthKeys}
              fieldPath="costs.vigilante"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Limpeza/Manutenção"
              values={visibleMonthValues.map((v) => v.costs.limpeza)}
              monthKeys={visibleMonthKeys}
              fieldPath="costs.limpeza"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Impostos"
              values={visibleMonthValues.map((v) => v.costs.impostos)}
              monthKeys={visibleMonthKeys}
              fieldPath="costs.impostos"
              onCellEdit={onCellEdit}
            />
            <tr>
              <td
                colSpan={visibleColSpan}
                className="sticky left-0 z-10 bg-gray-50 px-3 py-1.5 border-b border-gray-200"
              >
                <button
                  onClick={() => setShowOtherExpenses((v) => !v)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                >
                  <span className={`transition-transform inline-block ${showOtherExpenses ? 'rotate-90' : ''}`}>▶</span>
                  Outras despesas
                </button>
              </td>
            </tr>
            {showOtherExpenses && (
              <>
                <EditableDataRow
                  label="Trocas de Titularidade"
                  values={visibleMonthValues.map((v) => v.costs.trocaTitularidade)}
                  monthKeys={visibleMonthKeys}
                  fieldPath="costs.trocaTitularidade"
                  onCellEdit={onCellEdit}
                />
                <EditableDataRow
                  label="Taxas Economy Energy"
                  values={visibleMonthValues.map((v) => v.costs.taxasEconomy)}
                  monthKeys={visibleMonthKeys}
                  fieldPath="costs.taxasEconomy"
                  onCellEdit={onCellEdit}
                />
              </>
            )}
            <ReadOnlyDataRow
              label="Total Custos"
              values={visibleMonthValues.map((v) => v.totalCosts)}
              highlight
            />

            {/* ── Créditos per member ── */}
            <SectionHeader label="Créditos" colSpan={visibleColSpan} />
            {members.map((m) => [
              <MemberSubHeader
                key={`${m.id}-header`}
                name={m.name}
                address={m.address}
                colSpan={visibleColSpan}
              />,
              <EditableDataRow
                key={`${m.id}-consumo`}
                label="Consumo compensado"
                values={visibleMonthValues.map((v) => v.memberResults[m.id]?.consumo ?? 0)}
                monthKeys={visibleMonthKeys}
                fieldPath={`credits.${m.id}.consumo`}
                format="kwh"
                tooltip={m.address ? `${m.name} — ${m.address}` : m.name}
                indent
                onCellEdit={onCellEdit}
              />,
              <EditableDataRow
                key={`${m.id}-consumo-nao-compensado`}
                label="Energia não compensada"
                values={visibleMonthValues.map((v) => v.memberResults[m.id]?.consumoNaoCompensado ?? 0)}
                monthKeys={visibleMonthKeys}
                fieldPath={`credits.${m.id}.consumoNaoCompensado`}
                format="kwh"
                tooltip={m.address ? `${m.name} — ${m.address}` : m.name}
                indent
                onCellEdit={onCellEdit}
              />,
              <EditableDataRow
                key={`${m.id}-taxas`}
                label="Taxas"
                values={visibleMonthValues.map((v) => v.memberResults[m.id]?.taxas ?? 0)}
                monthKeys={visibleMonthKeys}
                fieldPath={`credits.${m.id}.taxas`}
                tooltip={m.address ? `${m.name} — ${m.address}` : m.name}
                indent
                onCellEdit={onCellEdit}
              />,
              <ReadOnlyDataRow
                key={`${m.id}-cobrar`}
                label="Cobrar"
                values={visibleMonthValues.map((v) => v.memberResults[m.id]?.cobrar ?? 0)}
                isComputed
                tooltip={m.address ? `${m.name} — ${m.address}` : m.name}
                indent
              />,
              <ReadOnlyDataRow
                key={`${m.id}-resultado`}
                label="Resultado"
                values={visibleMonthValues.map((v) => v.memberResults[m.id]?.resultado ?? 0)}
                isComputed
                tooltip={m.address ? `${m.name} — ${m.address}` : m.name}
                indent
              />,
            ])}
            <EditableDataRow
              label="Energia Gerada"
              values={visibleMonthValues.map((v) => v.creditosCompensar)}
              monthKeys={visibleMonthKeys}
              fieldPath="creditosCompensar"
              format="kwh"
              onCellEdit={onCellEdit}
            />
            <ReadOnlyDataRow
              label="Saldo após consumo"
              values={visibleMonthValues.map((v) => v.energyRemainder)}
              format="kwh"
              isComputed
            />

            {/* ── Ganhos ── */}
            <SectionHeader label="Ganhos" colSpan={visibleColSpan} />
            <EditableDataRow
              label="Economy Energy"
              values={visibleMonthValues.map((v) => v.gains.economyEnergy)}
              monthKeys={visibleMonthKeys}
              fieldPath="economyEnergy"
              onCellEdit={onCellEdit}
            />
            <ReadOnlyDataRow
              label="Ganho em créditos"
              values={visibleMonthValues.map((v) => v.gains.ganhoCreditos)}
              isComputed
            />
            <ReadOnlyDataRow
              label="Resultado parentes"
              values={visibleMonthValues.map((v) => v.gains.resultadoParentes)}
              isComputed
            />

            {/* ── Resultado ── */}
            <SectionHeader label="Resultado" colSpan={visibleColSpan} />
            <ReadOnlyDataRow label="Resultado Mês" values={visibleMonthValues.map((v) => v.resultadoMes)} highlight />
            <ReadOnlyDataRow label="Para o balanço" values={visibleMonthValues.map((v) => v.paraBalanco)} highlight />
          </tbody>
        </table>
      </div>
    </div>
  );
}
