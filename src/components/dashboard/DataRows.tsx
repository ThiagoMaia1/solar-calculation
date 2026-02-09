import { EditableCell, formatCellValue } from './EditableCell';
import type { CellFormat } from './EditableCell';

// ── Read-Only Data Row ──

interface DataRowProps {
  label: string;
  values: number[];
  format?: CellFormat;
  isComputed?: boolean;
  highlight?: boolean;
  tooltip?: string;
  indent?: boolean;
}

export function ReadOnlyDataRow({
  label,
  values,
  format = 'brl',
  isComputed = false,
  highlight = false,
  tooltip,
  indent = false,
}: DataRowProps) {
  return (
    <tr className={highlight ? 'bg-amber-50 font-semibold' : 'bg-gray-50/60'}>
      <td
        title={tooltip}
        className={`sticky left-0 z-10 px-3 py-1.5 text-sm border-b border-gray-200 whitespace-nowrap ${
          indent ? 'pl-6' : ''
        } ${highlight ? 'bg-amber-50 font-semibold' : 'bg-gray-50/60'} ${
          isComputed ? 'text-gray-400 italic' : 'text-gray-600'
        } ${tooltip ? 'cursor-help' : ''}`}
      >
        {label}
      </td>
      {values.map((val, i) => (
        <td
          key={i}
          className={`px-3 py-1.5 text-sm text-right border-b border-gray-200 whitespace-nowrap ${
            highlight ? 'font-semibold' : ''
          } ${isComputed && !highlight ? 'text-gray-400' : ''} ${val < 0 ? 'text-red-600' : ''}`}
        >
          {formatCellValue(val, format)}
        </td>
      ))}
    </tr>
  );
}

// ── Editable Data Row ──

interface EditableDataRowProps {
  label: string;
  values: number[];
  monthKeys: string[];
  fieldPath: string;
  format?: CellFormat;
  tooltip?: string;
  indent?: boolean;
  highlight?: boolean;
  onCellEdit: (monthKey: string, fieldPath: string, newValue: number) => void;
}

export function EditableDataRow({
  label,
  values,
  monthKeys,
  fieldPath,
  format = 'brl',
  tooltip,
  indent = false,
  highlight = false,
  onCellEdit,
}: EditableDataRowProps) {
  return (
    <tr className="group hover:bg-blue-50/60">
      <td
        title={tooltip}
        className={`sticky left-0 z-10 px-3 py-1.5 text-sm border-b border-gray-200 whitespace-nowrap bg-white group-hover:bg-blue-50/60 text-gray-800 transition-colors ${
          indent ? 'pl-6' : ''
        } ${tooltip ? 'cursor-help' : ''}`}
      >
        {label}
      </td>
      {values.map((val, i) => (
        <EditableCell
          key={monthKeys[i]}
          value={val}
          format={format}
          highlight={highlight}
          onSave={(newValue) => onCellEdit(monthKeys[i]!, fieldPath, newValue)}
        />
      ))}
    </tr>
  );
}
