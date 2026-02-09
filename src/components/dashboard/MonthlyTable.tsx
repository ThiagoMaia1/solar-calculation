import { useState } from 'react';
import { formatMonthLabel } from '../../utils/calculations';
import { SectionHeader, MemberSubHeader } from './SectionHeaders';
import { ReadOnlyDataRow, EditableDataRow } from './DataRows';
import type { ComputedMonthValues, Member } from '../../types';

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
  colSpan,
  onEditMonth,
  onDeleteMonth,
  onCellEdit,
}: MonthlyTableProps) {
  const hasOtherExpenses = monthValues.some(
    (v) => v.costs.trocaTitularidade !== 0 || v.costs.taxasEconomy !== 0,
  );
  const [showOtherExpenses, setShowOtherExpenses] = useState(hasOtherExpenses);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden h-full flex flex-col">
      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-30">
            <tr className="bg-gray-800 text-white">
              <th className="sticky left-0 z-40 bg-gray-800 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider min-w-[200px]">
                &nbsp;
              </th>
              {sortedMonthKeys.map((mk) => (
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
            <SectionHeader label="Valores" colSpan={colSpan} />
            <ReadOnlyDataRow
              label="Inversor c/ Depreciação"
              values={monthValues.map((v) => v.equipDep.inversor)}
              isComputed
            />
            <ReadOnlyDataRow
              label="Placas c/ Depreciação"
              values={monthValues.map((v) => v.equipDep.placas)}
              isComputed
            />
            <EditableDataRow
              label="Valor líquido da energia"
              values={monthValues.map((v) => v.energyValue)}
              monthKeys={sortedMonthKeys}
              fieldPath="energyValue"
              format="currency4"
              onCellEdit={onCellEdit}
            />

            {/* ── Custos ── */}
            <SectionHeader label="Custos" colSpan={colSpan} />
            <ReadOnlyDataRow
              label="Depreciação Inversor"
              values={monthValues.map((v) => v.costs.depreciacaoInversor)}
              isComputed
            />
            <ReadOnlyDataRow
              label="Depreciação Placas"
              values={monthValues.map((v) => v.costs.depreciacaoPlacas)}
              isComputed
            />
            <EditableDataRow
              label="Internet"
              values={monthValues.map((v) => v.costs.internet)}
              monthKeys={sortedMonthKeys}
              fieldPath="costs.internet"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Seguro"
              values={monthValues.map((v) => v.costs.seguro)}
              monthKeys={sortedMonthKeys}
              fieldPath="costs.seguro"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Iluminação Pública"
              values={monthValues.map((v) => v.costs.iluminacaoPublica)}
              monthKeys={sortedMonthKeys}
              fieldPath="costs.iluminacaoPublica"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Vigilante"
              values={monthValues.map((v) => v.costs.vigilante)}
              monthKeys={sortedMonthKeys}
              fieldPath="costs.vigilante"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Limpeza/Manutenção"
              values={monthValues.map((v) => v.costs.limpeza)}
              monthKeys={sortedMonthKeys}
              fieldPath="costs.limpeza"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Trocas de Titularidade"
              values={monthValues.map((v) => v.costs.trocaTitularidade)}
              monthKeys={sortedMonthKeys}
              fieldPath="costs.trocaTitularidade"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Impostos"
              values={monthValues.map((v) => v.costs.impostos)}
              monthKeys={sortedMonthKeys}
              fieldPath="costs.impostos"
              onCellEdit={onCellEdit}
            />
            <tr>
              <td
                colSpan={colSpan}
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
                  values={monthValues.map((v) => v.costs.trocaTitularidade)}
                  monthKeys={sortedMonthKeys}
                  fieldPath="costs.trocaTitularidade"
                  onCellEdit={onCellEdit}
                />
                <EditableDataRow
                  label="Taxas Economy Energy"
                  values={monthValues.map((v) => v.costs.taxasEconomy)}
                  monthKeys={sortedMonthKeys}
                  fieldPath="costs.taxasEconomy"
                  onCellEdit={onCellEdit}
                />
              </>
            )}

            {/* ── Créditos per member ── */}
            <SectionHeader label="Créditos" colSpan={colSpan} />
            {members.map((m) => [
              <MemberSubHeader
                key={`${m.id}-header`}
                name={m.name}
                address={m.address}
                colSpan={colSpan}
              />,
              <EditableDataRow
                key={`${m.id}-consumo`}
                label="Consumo"
                values={monthValues.map((v) => v.memberResults[m.id]?.consumo ?? 0)}
                monthKeys={sortedMonthKeys}
                fieldPath={`credits.${m.id}.consumo`}
                format="kwh"
                tooltip={m.address ? `${m.name} — ${m.address}` : m.name}
                indent
                onCellEdit={onCellEdit}
              />,
              <EditableDataRow
                key={`${m.id}-taxas`}
                label="Taxas"
                values={monthValues.map((v) => v.memberResults[m.id]?.taxas ?? 0)}
                monthKeys={sortedMonthKeys}
                fieldPath={`credits.${m.id}.taxas`}
                tooltip={m.address ? `${m.name} — ${m.address}` : m.name}
                indent
                onCellEdit={onCellEdit}
              />,
              <ReadOnlyDataRow
                key={`${m.id}-cobrar`}
                label="Cobrar"
                values={monthValues.map((v) => v.memberResults[m.id]?.cobrar ?? 0)}
                isComputed
                tooltip={m.address ? `${m.name} — ${m.address}` : m.name}
                indent
              />,
              <ReadOnlyDataRow
                key={`${m.id}-resultado`}
                label="Resultado"
                values={monthValues.map((v) => v.memberResults[m.id]?.resultado ?? 0)}
                isComputed
                tooltip={m.address ? `${m.name} — ${m.address}` : m.name}
                indent
              />,
            ])}
            <EditableDataRow
              label="Thiago Consumo"
              values={monthValues.map((v) => v.thiagoConsumo)}
              monthKeys={sortedMonthKeys}
              fieldPath="thiagoConsumo"
              format="kwh"
              onCellEdit={onCellEdit}
            />
            <EditableDataRow
              label="Energia Gerada Não Consumida"
              values={monthValues.map((v) => v.creditosCompensar)}
              monthKeys={sortedMonthKeys}
              fieldPath="creditosCompensar"
              format="kwh"
              onCellEdit={onCellEdit}
            />

            {/* ── Ganhos ── */}
            <SectionHeader label="Ganhos" colSpan={colSpan} />
            <EditableDataRow
              label="Economy Energy"
              values={monthValues.map((v) => v.gains.economyEnergy)}
              monthKeys={sortedMonthKeys}
              fieldPath="economyEnergy"
              onCellEdit={onCellEdit}
            />
            <ReadOnlyDataRow
              label="Ganho em créditos"
              values={monthValues.map((v) => v.gains.ganhoCreditos)}
              isComputed
            />
            <ReadOnlyDataRow
              label="Resultado parentes"
              values={monthValues.map((v) => v.gains.resultadoParentes)}
              isComputed
            />
            <ReadOnlyDataRow
              label="Economia própria"
              values={monthValues.map((v) => v.gains.economiaPropria)}
              isComputed
            />

            {/* ── Resultado ── */}
            <SectionHeader label="Resultado" colSpan={colSpan} />
            <ReadOnlyDataRow label="Resultado Mês" values={monthValues.map((v) => v.resultadoMes)} highlight />
            <ReadOnlyDataRow label="Para o balanço" values={monthValues.map((v) => v.paraBalanco)} highlight />
          </tbody>
        </table>
      </div>
    </div>
  );
}
