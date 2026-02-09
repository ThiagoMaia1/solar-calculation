interface SectionHeaderProps {
  label: string;
  colSpan: number;
}

export function SectionHeader({ label, colSpan }: SectionHeaderProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="bg-gray-100 font-bold text-xs uppercase tracking-wider text-gray-600 px-3 py-2 border-b border-gray-300"
      >
        {label}
      </td>
    </tr>
  );
}

interface MemberSubHeaderProps {
  name: string;
  address: string;
  colSpan: number;
}

export function MemberSubHeader({ name, address, colSpan }: MemberSubHeaderProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="sticky left-0 z-10 bg-blue-50 border-t-2 border-b border-blue-200 px-3 py-1.5"
      >
        <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">{name}</span>
        {address && (
          <span className="ml-2 text-[11px] text-blue-400" title={address}>
            📍 {address}
          </span>
        )}
      </td>
    </tr>
  );
}
