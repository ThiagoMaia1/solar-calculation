import { formatBRL } from '../../utils/calculations';
import type { Equipment, DepreciationValues } from '../../types';

interface EquipmentSummaryProps {
  equipment: Equipment;
  depreciation: DepreciationValues;
  totalEquipment: number;
  currentInversor: number | null;
  currentPlacas: number | null;
  currentEquipmentValue: number | null;
}

export function EquipmentSummary({
  equipment,
  depreciation,
  totalEquipment,
  currentInversor,
  currentPlacas,
  currentEquipmentValue,
}: EquipmentSummaryProps) {
  const hasMonths = currentEquipmentValue !== null;

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
        <p className="text-xs text-gray-500 uppercase">Inversor</p>
        <p className="text-lg font-bold text-gray-800">{formatBRL(equipment.inversor.value)}</p>
        <p className="text-xs text-gray-500">
          {equipment.inversor.lifespanYears} anos · Dep: {formatBRL(depreciation.inversor)}/mês
        </p>
        {hasMonths && (
          <p className="text-sm text-blue-600 font-semibold mt-1">
            Atual: {formatBRL(currentInversor!)}
          </p>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
        <p className="text-xs text-gray-500 uppercase">Placas</p>
        <p className="text-lg font-bold text-gray-800">{formatBRL(equipment.placas.value)}</p>
        <p className="text-xs text-gray-500">
          {equipment.placas.lifespanYears} anos · Dep: {formatBRL(depreciation.placas)}/mês
        </p>
        {hasMonths && (
          <p className="text-sm text-green-600 font-semibold mt-1">
            Atual: {formatBRL(currentPlacas!)}
          </p>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
        <p className="text-xs text-gray-500 uppercase">Total Equipamentos</p>
        <p className="text-lg font-bold text-gray-800">{formatBRL(totalEquipment)}</p>
        {hasMonths && (
          <p className="text-sm text-amber-600 font-semibold mt-1">
            Atual: {formatBRL(currentEquipmentValue)}
          </p>
        )}
      </div>
    </>
  );
}
