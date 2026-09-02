import React, { useState } from 'react';
import {
  Layers,
  Users,
  Plus,
  Trash2,
  Edit,
  X,
  Search,
  Sliders,
} from 'lucide-react';
import { BioreactorItem, OperatorItem, ProductPreset } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface RegistrationManagerProps {
  bioreactors: BioreactorItem[];
  operators: OperatorItem[];
  products: ProductPreset[];
  onUpdateBioreactors: (items: BioreactorItem[]) => void;
  onUpdateOperators: (items: OperatorItem[]) => void;
  onUpdateProducts: (items: ProductPreset[]) => void;
}

export const RegistrationManager: React.FC<RegistrationManagerProps> = ({
  bioreactors,
  operators,
  products,
  onUpdateBioreactors,
  onUpdateOperators,
  onUpdateProducts,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bioreactors' | 'operators'>('bioreactors');
  const [searchQuery, setSearchQuery] = useState('');

  // Deletion confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'bio' | 'op' | 'prod';
    id: string;
    name: string;
  } | null>(null);

  // Bioreactor form state
  const [bioModalOpen, setBioModalOpen] = useState(false);
  const [editingBio, setEditingBio] = useState<BioreactorItem | null>(null);
  const [bioCode, setBioCode] = useState('');
  const [bioName, setBioName] = useState('');
  const [bioCapacity, setBioCapacity] = useState<number>(5000);
  const [bioLocation, setBioLocation] = useState('');
  const [bioStatus, setBioStatus] = useState<'ativo' | 'manutencao' | 'inativo'>('ativo');
  const [bioNotes, setBioNotes] = useState('');

  // Operator form state
  const [opModalOpen, setOpModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<OperatorItem | null>(null);
  const [opName, setOpName] = useState('');
  const [opRole, setOpRole] = useState('Operador de Biorreatores');
  const [opShift, setOpShift] = useState('Turno 1 (06:00 - 14:00)');
  const [opStatus, setOpStatus] = useState<'ativo' | 'inativo'>('ativo');

  // --- Handlers: Bioreactors ---
  const handleOpenNewBio = () => {
    setEditingBio(null);
    setBioCode(`BIO-0${bioreactors.length + 1}`);
    setBioName('');
    setBioCapacity(5000);
    setBioLocation('Linha de Fermentação A');
    setBioStatus('ativo');
    setBioNotes('');
    setBioModalOpen(true);
  };

  const handleOpenEditBio = (item: BioreactorItem) => {
    setEditingBio(item);
    setBioCode(item.code);
    setBioName(item.name);
    setBioCapacity(item.capacityLiters);
    setBioLocation(item.location || '');
    setBioStatus(item.status);
    setBioNotes(item.notes || '');
    setBioModalOpen(true);
  };

  const handleSaveBio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bioCode.trim() || !bioName.trim()) return;

    if (editingBio) {
      const updated = bioreactors.map((b) =>
        b.id === editingBio.id
          ? {
              ...b,
              code: bioCode.trim().toUpperCase(),
              name: bioName.trim(),
              capacityLiters: Number(bioCapacity) || 0,
              location: bioLocation.trim(),
              status: bioStatus,
              notes: bioNotes.trim(),
            }
          : b
      );
      onUpdateBioreactors(updated);
    } else {
      const newItem: BioreactorItem = {
        id: `bio-${Date.now()}`,
        code: bioCode.trim().toUpperCase(),
        name: bioName.trim(),
        capacityLiters: Number(bioCapacity) || 0,
        location: bioLocation.trim(),
        status: bioStatus,
        notes: bioNotes.trim(),
      };
      onUpdateBioreactors([...bioreactors, newItem]);
    }
    setBioModalOpen(false);
  };

  const handleDeleteBio = (id: string, name: string) => {
    setDeleteTarget({ type: 'bio', id, name });
  };

  // --- Handlers: Operators ---
  const handleOpenNewOp = () => {
    setEditingOp(null);
    setOpName('');
    setOpRole('Operador de Biorreatores');
    setOpShift('Turno 1 (06:00 - 14:00)');
    setOpStatus('ativo');
    setOpModalOpen(true);
  };

  const handleOpenEditOp = (item: OperatorItem) => {
    setEditingOp(item);
    setOpName(item.name);
    setOpRole(item.role || '');
    setOpShift(item.shift || '');
    setOpStatus(item.status);
    setOpModalOpen(true);
  };

  const handleSaveOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opName.trim()) return;

    if (editingOp) {
      const updated = operators.map((o) =>
        o.id === editingOp.id
          ? {
              ...o,
              name: opName.trim(),
              role: opRole.trim(),
              shift: opShift.trim(),
              status: opStatus,
            }
          : o
      );
      onUpdateOperators(updated);
    } else {
      const newItem: OperatorItem = {
        id: `op-${Date.now()}`,
        name: opName.trim(),
        role: opRole.trim(),
        shift: opShift.trim(),
        status: opStatus,
      };
      onUpdateOperators([...operators, newItem]);
    }
    setOpModalOpen(false);
  };

  const handleDeleteOp = (id: string, name: string) => {
    setDeleteTarget({ type: 'op', id, name });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Painel de Cadastros Mestres Industriais
            </h2>
            <p className="text-xs text-slate-400">
              Gerencie os Biorreatores / Equipamentos e Pessoas / Operadores do sistema.
            </p>
          </div>
        </div>

        {/* SubTab Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setActiveSubTab('bioreactors');
              setSearchQuery('');
            }}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'bioreactors'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Equipamentos ({bioreactors.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('operators');
              setSearchQuery('');
            }}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'operators'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pessoas / Operadores ({operators.length})</span>
          </button>
        </div>
      </div>

      {/* Action Bar (Search + New Button) */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar registros..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          {activeSubTab === 'bioreactors' && (
            <button
              onClick={handleOpenNewBio}
              className="flex items-center space-x-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cadastrar Biorreator</span>
            </button>
          )}

          {activeSubTab === 'operators' && (
            <button
              onClick={handleOpenNewOp}
              className="flex items-center space-x-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cadastrar Operador</span>
            </button>
          )}
        </div>
      </div>

      {/* --- Tab 1: Bioreactors Table / Grid --- */}
      {activeSubTab === 'bioreactors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bioreactors
            .filter((b) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return (
                b.code.toLowerCase().includes(q) ||
                b.name.toLowerCase().includes(q) ||
                (b.location || '').toLowerCase().includes(q)
              );
            })
            .map((bio) => (
              <div
                key={bio.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl shadow-lg flex flex-col justify-between space-y-3 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono-num font-bold text-xs">
                      {bio.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-mono ${
                        bio.status === 'ativo'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : bio.status === 'manutencao'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {bio.status === 'ativo'
                        ? '● Ativo'
                        : bio.status === 'manutencao'
                        ? '▲ Manutenção'
                        : '○ Inativo'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{bio.name}</h3>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Capacidade:{' '}
                    <strong className="text-slate-200">{bio.capacityLiters.toLocaleString()} Litros</strong>
                  </div>
                  {bio.location && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      Localização: <span className="text-slate-300">{bio.location}</span>
                    </div>
                  )}
                  {bio.notes && (
                    <div className="text-[11px] text-slate-500 mt-2 italic bg-slate-950 p-2 rounded border border-white/5">
                      {bio.notes}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleOpenEditBio(bio)}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                    title="Editar equipamento"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBio(bio.id, bio.name ? `${bio.code} - ${bio.name}` : bio.code)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                    title="Excluir equipamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* --- Tab 2: Operators Table / Grid --- */}
      {activeSubTab === 'operators' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {operators
            .filter((op) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return (
                op.name.toLowerCase().includes(q) ||
                (op.role || '').toLowerCase().includes(q) ||
                (op.shift || '').toLowerCase().includes(q)
              );
            })
            .map((op) => (
              <div
                key={op.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl shadow-lg flex flex-col justify-between space-y-3 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs">
                      {op.name.charAt(0)}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-mono ${
                        op.status === 'ativo'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {op.status === 'ativo' ? '● Ativo' : '○ Inativo'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{op.name}</h3>
                  <div className="text-xs text-slate-400 mt-1">{op.role || 'Operador de Bioprocessos'}</div>
                  {op.shift && (
                    <div className="text-xs text-cyan-400/90 mt-1 font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800 inline-block">
                      {op.shift}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleOpenEditOp(op)}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                    title="Editar operador"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteOp(op.id, op.name)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                    title="Excluir operador"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal: Bioreactor Add/Edit */}
      {bioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingBio ? `Editar Equipamento ${editingBio.code}` : 'Cadastrar Novo Equipamento / Biorreator'}
              </h3>
              <button onClick={() => setBioModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBio} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    Código / Tag do Vaso <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bioCode}
                    onChange={(e) => setBioCode(e.target.value)}
                    placeholder="ex: BIO-07"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    Capacidade Útil (Litros) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={bioCapacity}
                    onChange={(e) => setBioCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-num focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Nome / Descrição do Biorreator <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bioName}
                  onChange={(e) => setBioName(e.target.value)}
                  placeholder="ex: Biorreator Fermentador de Inóculo Secundário"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Localização / Linha</label>
                  <input
                    type="text"
                    value={bioLocation}
                    onChange={(e) => setBioLocation(e.target.value)}
                    placeholder="ex: Linha Bacteriana A - Sala Limpa"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Status Operacional</label>
                  <select
                    value={bioStatus}
                    onChange={(e) => setBioStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="manutencao">Em Manutenção</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Notas Técnicas / Sensores</label>
                <input
                  type="text"
                  value={bioNotes}
                  onChange={(e) => setBioNotes(e.target.value)}
                  placeholder="ex: Eletrodo de pH recalibrado em 15/08"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBioModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition shadow-lg shadow-cyan-500/20"
                >
                  Salvar Equipamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Operator Add/Edit */}
      {opModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingOp ? `Editar Operador: ${editingOp.name}` : 'Cadastrar Novo Operador / Pessoa'}
              </h3>
              <button onClick={() => setOpModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOp} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Nome Completo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={opName}
                  onChange={(e) => setOpName(e.target.value)}
                  placeholder="ex: Lucas Albuquerque"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Cargo / Função</label>
                <input
                  type="text"
                  value={opRole}
                  onChange={(e) => setOpRole(e.target.value)}
                  placeholder="ex: Operador de Fermentação Pleno"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Turno de Trabalho</label>
                  <select
                    value={opShift}
                    onChange={(e) => setOpShift(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Turno 1 (06:00 - 14:00)">Turno 1 (06:00 - 14:00)</option>
                    <option value="Turno 2 (14:00 - 22:00)">Turno 2 (14:00 - 22:00)</option>
                    <option value="Turno 3 (22:00 - 06:00)">Turno 3 (22:00 - 06:00)</option>
                    <option value="Geral (08:00 - 17:00)">Geral (08:00 - 17:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Status</label>
                  <select
                    value={opStatus}
                    onChange={(e) => setOpStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOpModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition shadow-lg shadow-cyan-500/20"
                >
                  Salvar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Master Registrations */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.type === 'bio') {
            onUpdateBioreactors(bioreactors.filter((b) => b.id !== deleteTarget.id));
          } else if (deleteTarget.type === 'op') {
            onUpdateOperators(operators.filter((o) => o.id !== deleteTarget.id));
          }
          setDeleteTarget(null);
        }}
        title={
          deleteTarget?.type === 'bio'
            ? 'Excluir Biorreator'
            : 'Excluir Operador'
        }
        itemName={deleteTarget?.name}
        message={
          deleteTarget?.type === 'bio'
            ? 'Tem certeza que deseja excluir este equipamento do cadastro de biorreatores?'
            : 'Tem certeza que deseja excluir este operador do cadastro de equipe?'
        }
        confirmLabel="Confirmar Exclusão"
      />
    </div>
  );
};
