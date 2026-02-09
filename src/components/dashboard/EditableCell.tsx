import { useState, useEffect, useRef } from 'react';
import { formatBRL, formatNumber } from '../../utils/calculations';

export type CellFormat = 'brl' | 'kwh' | 'currency4' | 'number';

export function formatCellValue(val: number | null | undefined, format: CellFormat): string {
  if (val === null || val === undefined) return '—';
  switch (format) {
    case 'brl':
      return formatBRL(val);
    case 'kwh':
      return `${formatNumber(val, 0)} kWh`;
    case 'currency4':
      return `R$ ${formatNumber(val, 4)}`;
    default:
      return formatNumber(val);
  }
}

interface EditableCellProps {
  value: number;
  format: CellFormat;
  onSave: (newValue: number) => void;
  highlight?: boolean;
}

export function EditableCell({ value, format, onSave, highlight = false }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDoubleClick = () => {
    setEditValue(String(value).replace('.', ','));
    setEditing(true);
  };

  const handleSave = async () => {
    const parsed = parseFloat(editValue.replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(parsed) && parsed !== value) {
      setSaving(true);
      try {
        await onSave(parsed);
      } finally {
        setSaving(false);
      }
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <td className="px-1 py-0.5 border-b border-gray-200">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="w-full min-w-[80px] px-2 py-1 text-sm text-right border border-blue-400 rounded bg-blue-50 outline-none focus:ring-2 focus:ring-blue-300"
        />
      </td>
    );
  }

  return (
    <td
      onDoubleClick={handleDoubleClick}
      className={`px-3 py-1.5 text-sm text-right border-b border-gray-200 whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors ${
        highlight ? 'font-semibold' : ''
      } ${value < 0 ? 'text-red-600' : ''}`}
      title="Duplo clique para editar"
    >
      {formatCellValue(value, format)}
    </td>
  );
}
