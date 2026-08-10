import { useState, useCallback, useEffect } from 'react';
import { useAppData, useSaveSettings } from '../hooks/useAppData';
import {
  CALENDAR_MONTHS,
  COST_DEFAULT_FIELDS,
  DEFAULT_COST_DEFAULTS,
  ensureCostDefaults,
} from '../utils/costDefaults';
import type { MonthCostDefaults, Settings } from '../types';

function Field({
  label,
  hint,
  value,
  step = '0.01',
  onChange,
}: {
  label: string;
  hint?: string;
  value: number | string;
  step?: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function TextField({
  label,
  hint,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { data, isLoading } = useAppData();
  const saveSettingsMut = useSaveSettings();
  const [local, setLocal] = useState<Settings | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !local) {
      setLocal(ensureCostDefaults(data.settings));
    }
  }, [data, local]);

  const settings = local ?? data?.settings;

  const update = useCallback(
    (patch: Partial<Settings>) => {
      if (!settings) return;
      setLocal({ ...settings, ...patch });
      setDirty(true);
    },
    [settings],
  );

  const updatePix = useCallback(
    (field: string, value: string) => {
      if (!settings) return;
      const pix = settings.pix ?? { key: '', merchantName: '', merchantCity: '' };
      setLocal({ ...settings, pix: { ...pix, [field]: value } });
      setDirty(true);
    },
    [settings],
  );

  const updateCostDefault = useCallback(
    (monthKey: string, field: keyof MonthCostDefaults, value: string) => {
      if (!settings) return;
      const costDefaults = {
        ...(settings.costDefaults ?? DEFAULT_COST_DEFAULTS),
      };
      costDefaults[monthKey] = {
        ...(costDefaults[monthKey] ?? DEFAULT_COST_DEFAULTS[monthKey]!),
        [field]: parseFloat(value) || 0,
      };
      setLocal({ ...settings, costDefaults });
      setDirty(true);
    },
    [settings],
  );

  const handleSave = useCallback(() => {
    if (!local) return;
    saveSettingsMut.mutate(local, {
      onSuccess: () => setDirty(false),
      onError: (err) =>
        alert('Erro ao salvar: ' + (err instanceof Error ? err.message : 'Erro')),
    });
  }, [local, saveSettingsMut]);

  const handleReset = useCallback(() => {
    setLocal(data?.settings ? ensureCostDefaults(data.settings) : null);
    setDirty(false);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Carregando...</div>
      </div>
    );
  }

  if (!data || !settings) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Erro ao carregar dados.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Configuracoes</h1>
        {dirty && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              disabled={saveSettingsMut.isPending}
              className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium shadow disabled:opacity-50"
            >
              {saveSettingsMut.isPending ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            Tarifas e Taxas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Taxa de distribuicao (R$/kWh)"
              hint="Taxa nao compensada cobrada pela Enel por kWh (GD2)"
              value={settings.distributionFeePerKwh ?? 0}
              step="0.001"
              onChange={(v) => update({ distributionFeePerKwh: parseFloat(v) || 0 })}
            />
            <Field
              label="Taxa de distribuicao GD1 (R$/kWh)"
              hint="TUSD quando a Enel classifica a fatura do membro como GD1"
              value={settings.gd1DistributionFeePerKwh ?? 0.13}
              step="0.001"
              onChange={(v) => update({ gd1DistributionFeePerKwh: parseFloat(v) || 0 })}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            Datas
          </h2>
          <TextField
            label="Data de inicio (AAAA-MM)"
            hint="Mes de inicio para calculo de depreciacao"
            value={settings.startDate}
            placeholder="2024-01"
            onChange={(v) => update({ startDate: v })}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
            Custos padrão por mês
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Valores preenchidos automaticamente ao adicionar um novo mês (por mês do calendário).
            Depreciação é calculada a partir do equipamento.
          </p>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 sticky left-0 bg-white">
                    Custo
                  </th>
                  {CALENDAR_MONTHS.map(({ key, label }) => (
                    <th key={key} className="px-1 py-2 text-xs font-semibold text-gray-500 text-center min-w-[72px]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COST_DEFAULT_FIELDS.map(({ key, label }) => (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-xs text-gray-600 whitespace-nowrap sticky left-0 bg-white">
                      {label}
                    </td>
                    {CALENDAR_MONTHS.map(({ key: monthKey }) => {
                      const value =
                        settings.costDefaults?.[monthKey]?.[key] ??
                        DEFAULT_COST_DEFAULTS[monthKey]?.[key] ??
                        0;
                      return (
                        <td key={monthKey} className="px-1 py-1">
                          <input
                            type="number"
                            step="0.01"
                            value={value}
                            onChange={(e) => updateCostDefault(monthKey, key, e.target.value)}
                            className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs text-right focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            PIX
          </h2>
          <div className="space-y-4">
            <TextField
              label="Chave PIX"
              value={settings.pix?.key ?? ''}
              placeholder="CPF, e-mail ou chave aleatoria"
              onChange={(v) => updatePix('key', v)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Nome do beneficiario"
                value={settings.pix?.merchantName ?? ''}
                placeholder="Nome completo"
                onChange={(v) => updatePix('merchantName', v)}
              />
              <TextField
                label="Cidade"
                value={settings.pix?.merchantCity ?? ''}
                placeholder="Cidade"
                onChange={(v) => updatePix('merchantCity', v)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
