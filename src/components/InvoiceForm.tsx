import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { formatMonthLabel } from '../utils/calculations';
import InvoiceSummary from './InvoiceSummary';
import type { Member, MonthData } from '../types';

interface InvoiceFormProps {
  members: Member[];
  months: Record<string, MonthData>;
  sortedMonths: string[];
  generating: boolean;
  onGenerate: (values: { memberId: string; monthKey: string }) => void;
}

const validationSchema = Yup.object({
  memberId: Yup.string().required('Selecione um membro'),
  monthKey: Yup.string().required('Selecione um mês'),
});

export default function InvoiceForm({
  members,
  months,
  sortedMonths,
  generating,
  onGenerate,
}: InvoiceFormProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Dados da Fatura</h2>

      <Formik
        initialValues={{
          memberId: members[0]?.id ?? '',
          monthKey: sortedMonths[sortedMonths.length - 1] ?? '',
        }}
        validationSchema={validationSchema}
        onSubmit={onGenerate}
      >
        {({ values }) => {
          const selectedMonth = months[values.monthKey];
          const selectedMember = members.find((m) => m.id === values.memberId);
          const memberTaxas = selectedMonth?.credits?.[values.memberId]?.taxas ?? 0;
          const hasTaxas = memberTaxas !== 0;

          return (
            <Form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Membro da Família
                </label>
                <Field
                  as="select"
                  name="memberId"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Field>
                <ErrorMessage name="memberId" component="p" className="text-xs text-red-500 mt-1" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Mês de Referência
                </label>
                <Field
                  as="select"
                  name="monthKey"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  {sortedMonths.map((mk) => (
                    <option key={mk} value={mk}>
                      {formatMonthLabel(mk)}
                    </option>
                  ))}
                </Field>
                <ErrorMessage name="monthKey" component="p" className="text-xs text-red-500 mt-1" />
              </div>

              {selectedMember && selectedMonth && (
                <InvoiceSummary
                  member={selectedMember}
                  monthData={selectedMonth}
                  monthKey={values.monthKey}
                />
              )}

              {!hasTaxas && selectedMonth && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
                  <strong>Atenção:</strong> Não há taxas cadastradas para este membro neste mês.
                  Preencha as taxas da Enel antes de gerar a fatura.
                </div>
              )}

              <button
                type="submit"
                disabled={generating || !hasTaxas}
                className="w-full px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium transition-colors"
              >
                {generating ? 'Gerando...' : 'Gerar Fatura PDF'}
              </button>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}
