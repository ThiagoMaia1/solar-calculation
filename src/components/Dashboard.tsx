import { useState, useCallback } from 'react';
import { useAppData, useSaveMonth, useDeleteMonth } from '../hooks/useAppData';
import { useUndoRedo } from '../hooks/useUndoRedo';
import {
  computeMonthValues,
  formatMonthLabel,
  getMonthlyDepreciation,
  getNextMonthKey,
} from '../utils/calculations';
import MonthForm from './MonthForm';
import { EquipmentSummary } from './dashboard/EquipmentSummary';
import { InvestmentResult } from './dashboard/InvestmentResult';
import { MonthlyTable } from './dashboard/MonthlyTable';
import type { ComputedMonthValues, MonthData } from '../types';

// ── Helpers ──

/** Deep-clone a MonthData and set a nested value by dot path (e.g. "costs.internet") */
function setNestedValue<T>(obj: T, path: string, value: number): T {
  const clone = JSON.parse(JSON.stringify(obj)) as T;
  const keys = path.split('.');
  let current: any = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]!];
  }
  current[keys[keys.length - 1]!] = value;
  return clone;
}

// ── Dashboard ──

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useAppData();
  const saveMonth = useSaveMonth();
  const deleteMonthMut = useDeleteMonth();
  const { pushState, undo, redo, canUndo, canRedo } = useUndoRedo();
  const [editingMonth, setEditingMonth] = useState<string | null>(null);

  const handleSaveMonth = useCallback(
    (monthKey: string, monthData: MonthData) => {
      if (data) pushState(data.months);
      saveMonth.mutate(
        { monthKey, monthData },
        {
          onSuccess: () => setEditingMonth(null),
          onError: (err) =>
            alert('Erro ao salvar: ' + (err instanceof Error ? err.message : 'Unknown')),
        },
      );
    },
    [saveMonth, data, pushState],
  );

  const handleDeleteMonth = useCallback(
    (monthKey: string) => {
      if (!confirm(`Deseja deletar o mês ${formatMonthLabel(monthKey)}?`)) return;
      if (data) pushState(data.months);
      deleteMonthMut.mutate(monthKey, {
        onError: (err) =>
          alert('Erro ao deletar: ' + (err instanceof Error ? err.message : 'Unknown')),
      });
    },
    [deleteMonthMut, data, pushState],
  );

  /** Inline cell edit: update a single field in a month and persist */
  const handleCellEdit = useCallback(
    (monthKey: string, fieldPath: string, newValue: number) => {
      if (!data) return;
      const monthData = data.months[monthKey];
      if (!monthData) return;

      pushState(data.months);
      const updated = setNestedValue(monthData, fieldPath, newValue);
      saveMonth.mutate(
        { monthKey, monthData: updated },
        {
          onError: (err) =>
            alert('Erro ao salvar: ' + (err instanceof Error ? err.message : 'Erro')),
        },
      );
    },
    [data, saveMonth, pushState],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-semibold">Erro ao carregar dados</p>
        <p className="text-sm mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-3 py-1 bg-red-100 rounded text-sm hover:bg-red-200"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { equipment, members, months, settings } = data;
  const sortedMonthKeys = Object.keys(months).sort();
  const dep = getMonthlyDepreciation(equipment);
  const totalEquipment = equipment.inversor.value + equipment.placas.value;

  // Compute values for each month
  const monthValues = sortedMonthKeys
    .map((mk) => computeMonthValues(mk, data))
    .filter((v): v is ComputedMonthValues => v !== null);
  const colSpan = sortedMonthKeys.length + 1;

  // Current totals (from latest month)
  const latestMonth = monthValues.length > 0 ? monthValues[monthValues.length - 1]! : null;
  const currentInversor = latestMonth ? latestMonth.equipDep.inversor : null;
  const currentPlacas = latestMonth ? latestMonth.equipDep.placas : null;
  const currentEquipmentValue = latestMonth
    ? latestMonth.equipDep.inversor + latestMonth.equipDep.placas
    : null;
  const accumulatedResult = monthValues.reduce((sum, v) => sum + v.resultadoMes, 0);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <EquipmentSummary
          equipment={equipment}
          depreciation={dep}
          totalEquipment={totalEquipment}
          currentInversor={currentInversor}
          currentPlacas={currentPlacas}
          currentEquipmentValue={currentEquipmentValue}
        />
        {monthValues.length > 0 && (
          <InvestmentResult
            totalInvestment={totalEquipment}
            accumulatedResult={accumulatedResult}
            startDate={data.settings.startDate}
            latestMonthKey={sortedMonthKeys[sortedMonthKeys.length - 1]!}
          />
        )}
      </div>

      {/* Toolbar: Undo / Redo + Add Month */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z)"
            className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            ↩ Desfazer
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Shift+Z)"
            className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Refazer ↪
          </button>
        </div>
        <button
          onClick={() => setEditingMonth('__new__')}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium shadow"
        >
          + Adicionar Mês
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <MonthlyTable
          sortedMonthKeys={sortedMonthKeys}
          monthValues={monthValues}
          members={members}
          colSpan={colSpan}
          onEditMonth={setEditingMonth}
          onDeleteMonth={handleDeleteMonth}
          onCellEdit={handleCellEdit}
        />
      </div>

      {/* Month Form Modal */}
      {editingMonth && (
        <MonthForm
          isNew={editingMonth === '__new__'}
          monthKey={editingMonth === '__new__' ? getNextMonthKey(months) : editingMonth}
          monthData={editingMonth === '__new__' ? null : months[editingMonth]}
          members={members}
          settings={settings}
          onSave={handleSaveMonth}
          onClose={() => setEditingMonth(null)}
          saving={saveMonth.isPending}
        />
      )}
    </div>
  );
}
