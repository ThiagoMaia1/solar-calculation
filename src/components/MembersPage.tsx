import { useState, useCallback } from 'react';
import { useAppData, useSaveMembers } from '../hooks/useAppData';
import type { Member } from '../types';

function MemberCard({
  member,
  onChange,
}: {
  member: Member;
  onChange: (updated: Member) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
          {member.id}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Nome completo
          </label>
          <input
            type="text"
            value={member.name}
            onChange={(e) => onChange({ ...member, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
            placeholder="Nome completo do membro"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Endereco
          </label>
          <input
            type="text"
            value={member.address}
            onChange={(e) => onChange({ ...member, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
            placeholder="Rua, numero, bairro, cidade - UF"
          />
        </div>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const { data, isLoading } = useAppData();
  const saveMembersMut = useSaveMembers();
  const [localMembers, setLocalMembers] = useState<Member[] | null>(null);
  const [dirty, setDirty] = useState(false);

  // Sync local state when data loads for the first time
  const members = localMembers ?? data?.members ?? [];

  const handleChange = useCallback(
    (idx: number, updated: Member) => {
      const next = [...members];
      next[idx] = updated;
      setLocalMembers(next);
      setDirty(true);
    },
    [members],
  );

  const handleSave = useCallback(() => {
    if (!localMembers) return;
    saveMembersMut.mutate(localMembers, {
      onSuccess: () => {
        setDirty(false);
      },
      onError: (err) =>
        alert('Erro ao salvar: ' + (err instanceof Error ? err.message : 'Erro')),
    });
  }, [localMembers, saveMembersMut]);

  const handleReset = useCallback(() => {
    setLocalMembers(null);
    setDirty(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Carregando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Erro ao carregar dados.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Membros
        </h1>
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
              disabled={saveMembersMut.isPending}
              className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium shadow disabled:opacity-50"
            >
              {saveMembersMut.isPending ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Edite o nome e endereco de cada membro. Essas informacoes aparecem na fatura PDF.
      </p>

      <div className="space-y-4">
        {members.map((m, idx) => (
          <MemberCard
            key={m.id}
            member={m}
            onChange={(updated) => handleChange(idx, updated)}
          />
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          Nenhum membro cadastrado.
        </div>
      )}
    </div>
  );
}
