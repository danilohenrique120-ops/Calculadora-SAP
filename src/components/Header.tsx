import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  Plus,
  RotateCcw,
  Sliders,
  BarChart3,
  Flame,
  CheckCircle2,
  Users,
  Settings,
  Lock,
  Unlock,
  ChevronDown,
} from 'lucide-react';
import { ProductionOrder } from '../types';
import { calcOrderTotals } from '../utils/calculations';

interface HeaderProps {
  activeTab: 'grid' | 'analytics' | 'cadastros' | 'standards' | 'drivers';
  setActiveTab: (tab: 'grid' | 'analytics' | 'cadastros' | 'standards' | 'drivers') => void;
  orders: ProductionOrder[];
  onNewOrder: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onLoadMockData?: () => void;
  onResetData: () => void;
  onOpenPresets: () => void;
  isAuthenticatedAdmin?: boolean;
  onLockAdmin?: () => void;
  isCloudConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  orders,
  onNewOrder,
  onExportCSV,
  onExportJSON,
  onLoadMockData,
  onResetData,
  onOpenPresets,
  isAuthenticatedAdmin = false,
  onLockAdmin,
  isCloudConnected = true,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick stats for top pill (safe against undefined, null, or malformed items)
  const safeOrders = Array.isArray(orders) ? orders.filter((o): o is ProductionOrder => Boolean(o && typeof o === 'object')) : [];
  const activeOrdersCount = safeOrders.filter((o) => (o.status || 'em_andamento') === 'em_andamento').length;
  const criticalOrdersCount = safeOrders.filter((o) => {
    try {
      const t = calcOrderTotals(o);
      return Boolean(t && (t.hasBottleneck || t.overallStatus === 'critical'));
    } catch {
      return false;
    }
  }).length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl shadow-black/20">
      {/* Main Navigation Bar */}
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                  Calculadora <span className="text-cyan-400 font-light">SAP 4.0</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                  v4.0
                </span>
                {isCloudConnected ? (
                  <span
                    className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 rounded-full"
                    title="Conectado ao Firebase Firestore em Tempo Real"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">Tempo Real</span>
                  </span>
                ) : (
                  <span
                    className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium bg-amber-950/60 border border-amber-500/30 text-amber-400 rounded-full"
                    title="Conectando à nuvem..."
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>Conectando...</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Cálculo de Tempos, Critérios de Custos (HH/HM/GGF) & Desvios de Produção
              </p>
            </div>
          </div>

          {/* Tab Controls */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              id="tab-grid-btn"
              onClick={() => setActiveTab('grid')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'grid'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Grid Operacional</span>
              <span className="bg-black/30 px-1.5 py-0.2 text-[10px] rounded-full">
                {orders.length}
              </span>
            </button>

            <button
              id="tab-analytics-btn"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Dashboard & Analytics</span>
            </button>

            <button
              id="tab-cadastros-btn"
              onClick={() => setActiveTab('cadastros')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'cadastros'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cadastros (Equipamentos/Pessoas/Produtos)</span>
              {isAuthenticatedAdmin ? (
                <Unlock className="w-3 h-3 text-emerald-400 opacity-80" />
              ) : (
                <Lock className="w-3 h-3 text-amber-400/80" />
              )}
            </button>

            <button
              id="tab-standards-btn"
              onClick={() => setActiveTab('standards')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'standards'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Padrões (Standards)</span>
              {isAuthenticatedAdmin ? (
                <Unlock className="w-3 h-3 text-emerald-400 opacity-80" />
              ) : (
                <Lock className="w-3 h-3 text-amber-400/80" />
              )}
            </button>

            <button
              id="tab-drivers-btn"
              onClick={() => setActiveTab('drivers')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'drivers'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Critérios HH / HM / GGF</span>
              {isAuthenticatedAdmin ? (
                <Unlock className="w-3 h-3 text-emerald-400 opacity-80" />
              ) : (
                <Lock className="w-3 h-3 text-amber-400/80" />
              )}
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Lock Admin Button if currently unlocked */}
            {isAuthenticatedAdmin && onLockAdmin && (
              <button
                id="header-lock-admin-btn"
                type="button"
                onClick={onLockAdmin}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                title="Bloquear todos os painéis administrativos e sair do modo protegido"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Bloquear Admin</span>
              </button>
            )}

            {/* Export Menu Dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                id="header-export-btn"
                type="button"
                onClick={() => setIsExportOpen((prev) => !prev)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  isExportOpen
                    ? 'bg-slate-700 text-white border-cyan-500/50 shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Exportar dados operacionais e relatórios de custos"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">Exportar</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isExportOpen ? 'rotate-180 text-cyan-400' : ''}`} />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl py-1.5 z-50 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Formatos de Exportação
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportOpen(false);
                        onExportCSV();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/90 hover:text-white flex items-center space-x-2.5 transition group"
                    >
                      <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100">Planilha Excel / CSV</div>
                        <div className="text-[10px] text-slate-400">Com rateios HH / HM / GGF</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportOpen(false);
                        onExportJSON();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/90 hover:text-white flex items-center space-x-2.5 transition group"
                    >
                      <div className="p-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/20">
                        <Download className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100">Backup Completo (JSON)</div>
                        <div className="text-[10px] text-slate-400">Estrutura completa das OPs</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              id="header-new-op-btn"
              onClick={onNewOrder}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Ordem (OP)</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

