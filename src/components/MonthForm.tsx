import { useState, useEffect, useRef } from 'react';
import { Formik, Form, Field, ErrorMessage, useFormikContext } from 'formik';
import * as Yup from 'yup';
import type { Member, MonthData, Settings } from '../types';
import { resolveMonthPricing } from '../utils/calculations';
import { getDefaultCostsForMonthKey } from '../utils/costDefaults';

const num = Yup.number().min(0, 'Min 0').required('Obrigatório');

interface InputFieldProps {
  name: string;
  label: string;
  type?: string;
  step?: string;
}

function InputField({ name, label, type = 'number', step = '0.01' }: InputFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <Field
        id={name}
        name={name}
        type={type}
        step={step}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
      />
      <ErrorMessage name={name} component="p" className="text-xs text-red-500 mt-0.5" />
    </div>
  );
}

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

function MonthSelector() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 2 + i);
  const selectClass =
    'w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white';

  return (
    <Field name="monthKey">
      {({ field, form }: { field: { value: string }; form: { setFieldValue: (name: string, value: string) => void } }) => {
        const [y, m] = (field.value || '').split('-');
        const selectedYear = y || String(currentYear);
        const selectedMonth = m || '01';

        return (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mês</label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={selectedYear}
                onChange={(e) => form.setFieldValue('monthKey', `${e.target.value}-${selectedMonth}`)}
                className={selectClass}
              >
                {years.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => form.setFieldValue('monthKey', `${selectedYear}-${e.target.value}`)}
                className={selectClass}
              >
                {MONTHS.map((mo) => (
                  <option key={mo.value} value={mo.value}>{mo.value} – {mo.label}</option>
                ))}
              </select>
            </div>
            <ErrorMessage name="monthKey" component="p" className="text-xs text-red-500 mt-0.5" />
          </div>
        );
      }}
    </Field>
  );
}

function CostDefaultsSync({ isNew, settings }: { isNew: boolean; settings: Settings }) {
  const { values, setFieldValue } = useFormikContext<{ monthKey: string }>();
  const prevMonthKey = useRef<string | null>(null);

  useEffect(() => {
    if (!isNew) return;
    if (prevMonthKey.current === values.monthKey) return;
    prevMonthKey.current = values.monthKey;

    const defaults = getDefaultCostsForMonthKey(values.monthKey, settings);
    for (const [field, value] of Object.entries(defaults)) {
      setFieldValue(`costs.${field}`, value);
    }
  }, [isNew, settings, setFieldValue, values.monthKey]);

  return null;
}

interface MonthFormProps {
  isNew: boolean;
  monthKey: string;
  monthData: MonthData | null | undefined;
  members: Member[];
  settings: Settings;
  onSave: (monthKey: string, data: MonthData) => void;
  onClose: () => void;
  saving: boolean;
}

export default function MonthForm({
  isNew,
  monthKey,
  monthData,
  members,
  settings,
  onSave,
  onClose,
  saving,
}: MonthFormProps) {
  const hasOtherExpenses =
    (monthData?.costs?.trocaTitularidade ?? 0) !== 0 ||
    (monthData?.costs?.taxasEconomy ?? 0) !== 0;
  const [showOtherExpenses, setShowOtherExpenses] = useState(hasOtherExpenses);
  const now = new Date();
  const defaultMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const resolvedPricing = monthData
    ? resolveMonthPricing(monthData, settings)
    : null;

  const defaultCosts = getDefaultCostsForMonthKey(
    monthKey || defaultMonthKey,
    settings,
  );

  const initialValues = {
    monthKey: monthKey || (isNew ? defaultMonthKey : ''),
    discountPerKwh: resolvedPricing?.discountPerKwh ?? 0.22,
    enelBaseCostPerKwh: monthData?.enelBaseCostPerKwh ?? 0,
    costs: {
      internet: monthData?.costs?.internet ?? (isNew ? defaultCosts.internet : 0),
      seguro: monthData?.costs?.seguro ?? (isNew ? defaultCosts.seguro : 0),
      iluminacaoPublica:
        monthData?.costs?.iluminacaoPublica ?? (isNew ? defaultCosts.iluminacaoPublica : 0),
      vigilante: monthData?.costs?.vigilante ?? (isNew ? defaultCosts.vigilante : 0),
      limpeza: monthData?.costs?.limpeza ?? (isNew ? defaultCosts.limpeza : 0),
      trocaTitularidade: monthData?.costs?.trocaTitularidade ?? 0,
      impostos: monthData?.costs?.impostos ?? (isNew ? defaultCosts.impostos : 0),
      taxasEconomy: monthData?.costs?.taxasEconomy ?? 0,
    },
    credits: Object.fromEntries(
      members.map((m) => [
        m.id,
        {
          consumo: monthData?.credits?.[m.id]?.consumo ?? 0,
          taxas: monthData?.credits?.[m.id]?.taxas ?? 0,
          consumoNaoCompensado: monthData?.credits?.[m.id]?.consumoNaoCompensado ?? 0,
          gd1: monthData?.credits?.[m.id]?.gd1 ?? false,
        },
      ])
    ),
    thiagoConsumo: monthData?.thiagoConsumo ?? 0,
    creditosCompensar: monthData?.creditosCompensar ?? 0,
    economyEnergy: monthData?.economyEnergy ?? 0,
  };

  const validationSchema = Yup.object({
    monthKey: isNew
      ? Yup.string()
          .required('Obrigatório')
          .matches(/^\d{4}-\d{2}$/, 'Formato: AAAA-MM')
      : Yup.string(),
    discountPerKwh: Yup.number().min(0).required('Obrigatório'),
    enelBaseCostPerKwh: Yup.number().min(0).required('Obrigatório'),
    costs: Yup.object({
      internet: num,
      seguro: num,
      iluminacaoPublica: num,
      vigilante: num,
      limpeza: num,
      trocaTitularidade: num,
      impostos: num,
      taxasEconomy: num,
    }),
    thiagoConsumo: num,
    creditosCompensar: num,
    economyEnergy: num,
  });

  const handleSubmit = (values: typeof initialValues) => {
    const { monthKey: mk, ...monthPayload } = values;
    const clean = deepParseNumbers(monthPayload) as MonthData;
    if (monthData?.energyValue != null) {
      clean.energyValue = monthData.energyValue;
    }
    onSave(isNew ? mk : monthKey, clean);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 mb-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {isNew ? 'Adicionar Mês' : `Editar ${monthKey}`}
            </h2>
            <h3>
              (Contas com vencimento em 10 de {monthKey.split('-')[1]} de {monthKey.split('-')[0]})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {() => (
            <Form className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              <CostDefaultsSync isNew={isNew} settings={settings} />
              {isNew && <MonthSelector />}

              <InputField
                name="enelBaseCostPerKwh"
                label="Tarifa base Enel do mês (R$/kWh)"
                step="0.01"
              />
              <InputField
                name="discountPerKwh"
                label="Desconto sobre tarifa base Enel (R$/kWh)"
                step="0.01"
              />

              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">Custos</legend>
                <div className="grid grid-cols-2 gap-3">
                  <InputField name="costs.internet" label="Internet" />
                  <InputField name="costs.seguro" label="Seguro" />
                  <InputField name="costs.iluminacaoPublica" label="Iluminação Pública" />
                  <InputField name="costs.vigilante" label="Vigilante" />
                  <InputField name="costs.limpeza" label="Limpeza/Manutenção" />
                  <InputField name="costs.impostos" label="Impostos" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowOtherExpenses((v) => !v)}
                  className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                >
                  <span className={`transition-transform inline-block ${showOtherExpenses ? 'rotate-90' : ''}`}>▶</span>
                  Outras despesas
                </button>
                {showOtherExpenses && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                    <InputField name="costs.trocaTitularidade" label="Trocas de Titularidade" />
                    <InputField name="costs.taxasEconomy" label="Taxas Economy Energy" />
                  </div>
                )}
              </fieldset>

              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">
                  Créditos Familiares
                </legend>
                {members.map((m) => (
                  <div key={m.id} className="mb-3 last:mb-0">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">{m.name}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <InputField name={`credits.${m.id}.consumo`} label="Consumo compensado (kWh)" step="1" />
                      <InputField name={`credits.${m.id}.consumoNaoCompensado`} label="Energia não compensada (kWh)" step="1" />
                      <InputField name={`credits.${m.id}.taxas`} label="Taxas Enel (R$)" />
                    </div>
                    <Field name={`credits.${m.id}.gd1`}>
                      {({ field, form }: {
                        field: { name: string; value: boolean };
                        form: { setFieldValue: (name: string, value: boolean) => void };
                      }) => (
                        <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={field.value === true}
                            onChange={(e) => form.setFieldValue(field.name, e.target.checked)}
                            className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                          />
                          Fatura Enel GD1 (TUSD reduzida)
                        </label>
                      )}
                    </Field>
                  </div>
                ))}
              </fieldset>

              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">Outros</legend>
                <div className="grid grid-cols-2 gap-3">
                  <InputField name="creditosCompensar" label="Energia Gerada (kWh)" step="1" />
                  <InputField name="economyEnergy" label="Economy Energy (R$)" />
                </div>
              </fieldset>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}

/**
 * Recursively parse all string number values to actual numbers.
 */
function deepParseNumbers(obj: unknown): unknown {
  if (typeof obj === 'boolean') return obj;
  if (typeof obj !== 'object' || obj === null) {
    const n = Number(obj);
    return isNaN(n) ? obj : n;
  }
  if (Array.isArray(obj)) return obj.map(deepParseNumbers);
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = deepParseNumbers(val);
  }
  return result;
}
