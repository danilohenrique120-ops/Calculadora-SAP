import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Copy,
  Edit,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  User,
  Calendar,
  Layers,
  ArrowUpDown,
  X,
  Flame,
  LayoutGrid,
  Table as TableIcon,
  SlidersHorizontal,
  Check,
  Tag,
  ArrowRight,
  Link as LinkIcon,
  GitFork,
} from 'lucide-react';
import {
  ProcessStageId,
  PROCESS_STAGES,
  ProductionOrder,
  StageRecord,
  BioreactorItem,
  OperatorItem,
  ProductPreset,
  CostDriverRule,
  VarianceThresholdConfig,
} from '../types';
import {
  calcStageMetrics,
  calcOrderTotals,
  formatMinutes,
  formatPercent,
  getStatusTheme,
} from '../utils/calculations';
import { BIOREACTOR_LIST, OPERATOR_LIST, PRODUCT_PRESETS } from '../utils/mockData';
import { StageCell } from './StageCell';
import { ConfirmModal } from './ConfirmModal';

interface OperationalGridProps {
  orders: ProductionOrder[];
  onUpdateOrder: (order: ProductionOrder) => void;
  onDeleteOrder: (id: string) => void;
  onDuplicateOrder: (order: ProductionOrder) => void;
  onEditOrderModal: (order: ProductionOrder) => void;
  onNewOrder: () => void;
  bioreactors?: BioreactorItem[];
  operators?: OperatorItem[];
  products?: ProductPreset[];
  driverRules?: CostDriverRule[];
  varianceThresholds?: VarianceThresholdConfig;
}

export const OperationalGrid: React.FC<OperationalGridProps> = ({
  orders,
  onUpdateOrder,
  onDeleteOrder,
  onDuplicateOrder,
  onEditOrderModal,
  onNewOrder,
  bioreactors = [],
  operators = [],
  products = [],
  driverRules,
  varianceThresholds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBioreactor, setSelectedBioreactor] = useState<string>('all');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'opNumber' | 'prepDate' | 'bioreactorId' | 'totalVarianceMin'>('prepDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Deletion modal states
  const [orderToDelete, setOrderToDelete] = useState<ProductionOrder | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Display mode: 'table' (Tabela Limpa) or 'cards' (Cards Visuais)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  // Direct edit mode: when true, renders all input fields permanently in the table cells
  const [directEditMode, setDirectEditMode] = useState(false);

  // Dynamic distinct lists from orders and master lists
  const availableBioreactors = useMemo(() => {
    const list = new Set<string>();
    bioreactors.forEach((b) => list.add(b.code));
    BIOREACTOR_LIST.forEach((b) => list.add(b));
    orders.forEach((o) => list.add(o.bioreactorId));
    return Array.from(list).sort();
  }, [bioreactors, orders]);

  const availableOperators = useMemo(() => {
    const list = new Set<string>();
    operators.forEach((op) => list.add(op.name));
    OPERATOR_LIST.forEach((op) => list.add(op));
    orders.forEach((o) => list.add(o.operatorName));
    return Array.from(list).sort();
  }, [operators, orders]);

  const availableProducts = useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => list.add(p.name));
    PRODUCT_PRESETS.forEach((p) => list.add(p.name));
    orders.forEach((o) => list.add(o.productName));
    return Array.from(list).sort();
  }, [products, orders]);

  // Dynamic distinct years extracted from orders
  const availableYears = useMemo(() => {
    const list = new Set<string>();
    orders.forEach((o) => {
      if (o.prepDate) {
        const year = o.prepDate.split('-')[0];
        if (year && year.length === 4) list.add(year);
      }
    });
    return Array.from(list).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  const monthOptions = [
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

  // Filter logic
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            order.opNumber.toLowerCase().includes(q) ||
            order.bioreactorId.toLowerCase().includes(q) ||
            order.operatorName.toLowerCase().includes(q) ||
            order.productName.toLowerCase().includes(q) ||
            (order.linkedOrder?.linkedOpNumber || '').toLowerCase().includes(q) ||
            (order.notes || '').toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Bioreactor filter
        if (selectedBioreactor !== 'all' && order.bioreactorId !== selectedBioreactor) {
          return false;
        }

        // Operator filter
        if (selectedOperator !== 'all' && order.operatorName !== selectedOperator) {
          return false;
        }

        // Product filter
        if (selectedProduct !== 'all' && order.productName !== selectedProduct) {
          return false;
        }

        // Year filter
        if (selectedYear !== 'all') {
          const y = order.prepDate?.split('-')[0];
          if (y !== selectedYear) return false;
        }

        // Month filter
        if (selectedMonth !== 'all') {
          const m = order.prepDate?.split('-')[1];
          if (m !== selectedMonth) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField as keyof ProductionOrder];
        let valB: any = b[sortField as keyof ProductionOrder];

        if (sortField === 'totalVarianceMin') {
          valA = calcOrderTotals(a, driverRules, varianceThresholds).totalVarianceMin;
          valB = calcOrderTotals(b, driverRules, varianceThresholds).totalVarianceMin;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [
    orders,
    searchQuery,
    selectedBioreactor,
    selectedOperator,
    selectedProduct,
    selectedYear,
    selectedMonth,
    sortField,
    sortDirection,
    driverRules,
    varianceThresholds,
  ]);

  // Summary stats on filtered data
  const summaryStats = useMemo(() => {
    let totalReal = 0;
    let totalStd = 0;
    let onTimeCount = 0;
    let criticalCount = 0;

    filteredOrders.forEach((o) => {
      const t = calcOrderTotals(o, driverRules, varianceThresholds);
      totalReal += t.totalRealMin;
      totalStd += t.totalStandardMin;
      if (t.overallStatus === 'ok') onTimeCount++;
      if (t.overallStatus === 'critical') criticalCount++;
    });

    const adherence = filteredOrders.length > 0 ? (onTimeCount / filteredOrders.length) * 100 : 0;
    const avgDuration = filteredOrders.length > 0 ? totalReal / filteredOrders.length : 0;

    return {
      total: filteredOrders.length,
      adherence,
      criticalCount,
      avgDuration,
      totalVarianceMin: totalReal - totalStd,
    };
  }, [filteredOrders, driverRules, varianceThresholds]);

  const handleSort = (field: 'opNumber' | 'prepDate' | 'bioreactorId' | 'totalVarianceMin') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleStageUpdate = (order: ProductionOrder, stageId: ProcessStageId, updates: Partial<StageRecord>) => {
    const updatedOrder: ProductionOrder = {
      ...order,
      stages: {
        ...order.stages,
        [stageId]: {
          ...order.stages[stageId],
          ...updates,
        },
      },
      updatedAt: new Date().toISOString(),
    };
    onUpdateOrder(updatedOrder);
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedOrderIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedOrderIds(next);
  };

  const handleBulkDelete = () => {
    if (selectedOrderIds.size > 0) {
      setBulkDeleteOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Bar: Search, Filters & View Toggles */}
      <div className="bg-slate-900/90 border border-slate-800/90 p-3.5 rounded-xl shadow-sm space-y-3">
        {/* Row 1: Search & Dropdowns */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por OP, Biorreator, Produto, Operador..."
              className="w-full bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 focus:border-cyan-500 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Mes Filter */}
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2 py-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400 mr-1.5 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
                title="Filtrar por Mês"
              >
                <option value="all" className="bg-slate-900 text-white">Todos os Meses</option>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ano Filter */}
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2 py-1">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-mono pr-1"
                title="Filtrar por Ano"
              >
                <option value="all" className="bg-slate-900 text-white">Todos os Anos</option>
                {availableYears.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Bioreactor Filter */}
            <select
              value={selectedBioreactor}
              onChange={(e) => setSelectedBioreactor(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todos Biorreatores</option>
              {availableBioreactors.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Operator Filter */}
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todos Operadores</option>
              {availableOperators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>

            {/* Product Filter */}
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 max-w-[180px] truncate"
            >
              <option value="all">Todos Produtos</option>
              {availableProducts.map((prod) => (
                <option key={prod} value={prod}>
                  {prod}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {(selectedBioreactor !== 'all' ||
              selectedOperator !== 'all' ||
              selectedProduct !== 'all' ||
              selectedYear !== 'all' ||
              selectedMonth !== 'all' ||
              searchQuery) && (
              <button
                onClick={() => {
                  setSelectedBioreactor('all');
                  setSelectedOperator('all');
                  setSelectedProduct('all');
                  setSelectedYear('all');
                  setSelectedMonth('all');
                  setSearchQuery('');
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline px-1 font-medium"
              >
                Limpar
              </button>
            )}
          </div>

          {/* View Mode & Direct Edit Toggle */}
          <div className="flex items-center space-x-2 border-l border-slate-800 pl-3">
            <div className="bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex items-center">
              <button
                onClick={() => setViewMode('table')}
                title="Visualização em Tabela Limpa"
                className={`p-1.5 rounded text-xs flex items-center space-x-1 transition ${
                  viewMode === 'table'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabela</span>
              </button>

              <button
                onClick={() => setViewMode('cards')}
                title="Visualização em Cards Operacionais"
                className={`p-1.5 rounded text-xs flex items-center space-x-1 transition ${
                  viewMode === 'cards'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedOrderIds.size > 0 && (
        <div className="bg-cyan-950/70 border border-cyan-700/50 p-2.5 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center space-x-2 text-cyan-200">
            <span className="font-bold">{selectedOrderIds.size}</span>
            <span>ordens de produção selecionadas</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkDelete}
              className="flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold transition shadow"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Selecionadas</span>
            </button>
            <button
              onClick={() => setSelectedOrderIds(new Set())}
              className="px-2 py-1 text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: CLEAN SPREADSHEET TABLE */}
      {viewMode === 'table' && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1150px]">
              <thead>
                <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <th className="py-3 px-3 w-9 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredOrders.length > 0 &&
                        selectedOrderIds.size === filteredOrders.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th
                    onClick={() => handleSort('opNumber')}
                    className="py-3 px-3 cursor-pointer hover:text-cyan-400 transition"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Ordem / Biorreator</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('prepDate')}
                    className="py-3 px-2 cursor-pointer hover:text-cyan-400 transition"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Data / Operador</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  {/* 5 Stage Columns */}
                  {PROCESS_STAGES.map((stage) => (
                    <th key={stage.id} className="py-3 px-2 text-center min-w-[140px]">
                      <div className="font-semibold text-slate-200">{stage.label}</div>
                      <span className="text-[9px] text-slate-500 font-normal">
                        Std: {stage.defaultStandardMin}m
                      </span>
                    </th>
                  ))}
                  {/* Totals Column */}
                  <th
                    onClick={() => handleSort('totalVarianceMin')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-cyan-400 transition min-w-[130px]"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Tempo Total & Desvio</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center w-24">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/50 text-xs">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
                      <p className="text-sm font-semibold text-slate-400">
                        Nenhuma ordem de produção encontrada com os filtros aplicados.
                      </p>
                      <button
                        onClick={onNewOrder}
                        className="mt-3 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs"
                      >
                        + Nova Ordem de Produção
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const totals = calcOrderTotals(order, driverRules, varianceThresholds);
                    const isExpanded = expandedOrderId === order.id;
                    const isSelected = selectedOrderIds.has(order.id);
                    const statusTheme = getStatusTheme(totals.overallStatus);

                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className={`transition-colors hover:bg-slate-800/40 ${
                            isSelected ? 'bg-cyan-950/20' : ''
                          } ${isExpanded ? 'bg-slate-800/40' : ''}`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(order.id)}
                              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* OP & Bioreactor Badge */}
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-xs">
                                {order.bioreactorId}
                              </span>
                              <div>
                                <div className="font-bold text-white font-mono flex items-center gap-1.5">
                                  {order.opNumber}
                                  {order.status === 'em_andamento' && (
                                    <span
                                      className="w-2 h-2 rounded-full bg-amber-400 animate-ping"
                                      title="Em Andamento"
                                    />
                                  )}
                                </div>
                                <div
                                  className="text-[11px] text-slate-400 truncate max-w-[160px] flex items-center gap-1.5"
                                  title={order.productName}
                                >
                                  <span className="truncate">{order.productName}</span>
                                  {order.scaleName && (
                                    <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700 shrink-0">
                                      {order.scaleName}
                                    </span>
                                  )}
                                </div>
                                {order.linkedOrder && order.linkedOrder.linkedOpNumber && (
                                  <div
                                    className="mt-1 flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 rounded px-1.5 py-0.2 w-fit"
                                    title={`Empenhada/Vinculada à ${order.linkedOrder.linkedOpNumber} (${order.linkedOrder.relationType === 'inoculo' ? 'Inóculo/Semente' : order.linkedOrder.relationType}) ${order.linkedOrder.volumeLiters ? `- ${order.linkedOrder.volumeLiters}L` : ''}`}
                                  >
                                    <LinkIcon className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate max-w-[110px]">
                                      {order.linkedOrder.relationType === 'inoculo' ? 'Inóculo:' : 'Empenho:'} {order.linkedOrder.linkedOpNumber}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Date & Operator */}
                          <td className="py-3 px-2">
                            <div className="text-slate-300 font-mono text-[11px]">
                              {order.prepDate}
                            </div>
                            <div className="text-slate-400 text-[11px] flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[120px]" title={order.operatorName}>
                                {order.operatorName}
                              </span>
                            </div>
                          </td>

                          {/* 5 Stage Cells */}
                          {PROCESS_STAGES.map((stageDef) => (
                            <td key={stageDef.id} className="py-2 px-1.5 align-top">
                              <StageCell
                                stageId={stageDef.id}
                                stageName={stageDef.shortLabel}
                                record={order.stages[stageDef.id]}
                                prepDate={order.prepDate}
                                orderProductName={order.productName}
                                orderScaleName={order.scaleName}
                                orderStages={order.stages}
                                onUpdate={(updates) =>
                                  handleStageUpdate(order, stageDef.id, updates)
                                }
                                directEditMode={directEditMode}
                                driverRules={driverRules}
                                varianceThresholds={varianceThresholds}
                              />
                            </td>
                          ))}

                          {/* Total Time & Variance Pill */}
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold font-mono text-white text-xs">
                              {totals.completedStagesCount > 0
                                ? formatMinutes(totals.totalRealMin)
                                : '--'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              Std:{' '}
                              {totals.completedStagesCount > 0
                                ? formatMinutes(totals.totalStandardMin)
                                : '--'}
                            </div>
                            <div className="mt-1">
                              {totals.completedStagesCount > 0 ? (
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${statusTheme.badge}`}
                                >
                                  {totals.totalVarianceMin > 0
                                    ? `+${totals.totalVarianceMin}m`
                                    : `${totals.totalVarianceMin}m`}{' '}
                                  ({formatPercent(totals.totalVariancePercent)})
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">Pendente</span>
                              )}
                            </div>

                            {/* Mini Cost Breakdown summary badge (HH, HM, GGF) with min & % */}
                            {totals.costTotals && totals.completedStagesCount > 0 && (
                              <div
                                className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex flex-col items-end gap-1 text-[8.5px] font-mono"
                                title={`Totais da OP:\n• Hora Homem (HH): Std ${totals.costTotals.hh.standardMin}m | Real ${totals.costTotals.hh.realMin}m | Variação: ${totals.costTotals.hh.varianceMin > 0 ? `+${totals.costTotals.hh.varianceMin}` : totals.costTotals.hh.varianceMin}m (${formatPercent(totals.costTotals.hh.variancePercent)})\n• Hora Máquina (HM): Std ${totals.costTotals.hm.standardMin}m | Real ${totals.costTotals.hm.realMin}m | Variação: ${totals.costTotals.hm.varianceMin > 0 ? `+${totals.costTotals.hm.varianceMin}` : totals.costTotals.hm.varianceMin}m (${formatPercent(totals.costTotals.hm.variancePercent)})\n• GGF: Std ${totals.costTotals.ggf.standardMin}m | Real ${totals.costTotals.ggf.realMin}m | Variação: ${totals.costTotals.ggf.varianceMin > 0 ? `+${totals.costTotals.ggf.varianceMin}` : totals.costTotals.ggf.varianceMin}m (${formatPercent(totals.costTotals.ggf.variancePercent)})`}
                              >
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-950/70 border border-blue-900/40 text-blue-300">
                                    <strong className="text-[8px] text-blue-400">HH:</strong>
                                    <span>{totals.costTotals.hh.realMin}m</span>
                                    <span className={`text-[8px] font-bold ${totals.costTotals.hh.varianceMin > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                      ({totals.costTotals.hh.varianceMin > 0 ? `+${totals.costTotals.hh.varianceMin}` : totals.costTotals.hh.varianceMin}m | {formatPercent(totals.costTotals.hh.variancePercent)})
                                    </span>
                                  </span>

                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-950/70 border border-amber-900/40 text-amber-300">
                                    <strong className="text-[8px] text-amber-400">HM:</strong>
                                    <span>{totals.costTotals.hm.realMin}m</span>
                                    <span className={`text-[8px] font-bold ${totals.costTotals.hm.varianceMin > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                      ({totals.costTotals.hm.varianceMin > 0 ? `+${totals.costTotals.hm.varianceMin}` : totals.costTotals.hm.varianceMin}m | {formatPercent(totals.costTotals.hm.variancePercent)})
                                    </span>
                                  </span>

                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-purple-950/70 border border-purple-900/40 text-purple-300">
                                    <strong className="text-[8px] text-purple-400">GGF:</strong>
                                    <span>{totals.costTotals.ggf.realMin}m</span>
                                    <span className={`text-[8px] font-bold ${totals.costTotals.ggf.varianceMin > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                      ({totals.costTotals.ggf.varianceMin > 0 ? `+${totals.costTotals.ggf.varianceMin}` : totals.costTotals.ggf.varianceMin}m | {formatPercent(totals.costTotals.ggf.variancePercent)})
                                    </span>
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() =>
                                  setExpandedOrderId(isExpanded ? null : order.id)
                                }
                                title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                                className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-800 transition"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                onClick={() => onEditOrderModal(order)}
                                title="Editar cabeçalho e dados da OP"
                                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onDuplicateOrder(order)}
                                title="Duplicar OP como novo lote"
                                className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800 transition"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setOrderToDelete(order)}
                                title="Excluir OP"
                                className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Clean Summary Row */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80 border-b border-slate-800">
                            <td colSpan={9} className="p-4">
                              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-inner">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                                      Resumo Operacional da OP: {order.opNumber}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">
                                      Escala: {order.scaleName || (order.batchVolumeLiters ? `${order.batchVolumeLiters}L` : '5000L')} ({order.batchVolumeLiters || 5000} L) | Produto: {order.productName}
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-slate-400">Status:</span>
                                    <select
                                      value={order.status}
                                      onChange={(e) =>
                                        onUpdateOrder({
                                          ...order,
                                          status: e.target.value as any,
                                          updatedAt: new Date().toISOString(),
                                        })
                                      }
                                      className="bg-slate-950 border border-slate-700 text-xs text-white rounded px-2 py-1 focus:border-cyan-500"
                                    >
                                      <option value="em_andamento">Em Andamento</option>
                                      <option value="concluido">Concluído</option>
                                      <option value="cancelado">Cancelado</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Consolidated Cost Breakdown (HH, HM, GGF) across this OP */}
                                {totals.costTotals && (
                                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                                        Consolidação de Setup & Direcionadores de Custo (HH, HM, GGF)
                                      </span>
                                      <span className="text-[11px] text-slate-500 font-mono">
                                        Total Real vs Standard da OP
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      {/* Hora Homem (HH) Card */}
                                      <div className="bg-slate-900/90 border border-blue-900/50 rounded-lg p-2.5 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-blue-300 font-mono flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                                            Hora Homem (HH)
                                          </span>
                                          <span className={`text-[11px] font-bold font-mono ${
                                            totals.costTotals.hh.varianceMin > 0 ? 'text-amber-400' : 'text-emerald-400'
                                          }`}>
                                            {totals.costTotals.hh.varianceMin > 0 ? `+${totals.costTotals.hh.varianceMin}m` : `${totals.costTotals.hh.varianceMin}m`}{' '}
                                            ({formatPercent(totals.costTotals.hh.variancePercent)})
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                                          <span>Standard: <strong className="text-slate-200">{totals.costTotals.hh.standardMin}m</strong></span>
                                          <span>Real: <strong className="text-white">{totals.costTotals.hh.realMin}m</strong></span>
                                        </div>
                                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                          <div
                                            className={`h-full ${totals.costTotals.hh.varianceMin > 0 ? 'bg-amber-400' : 'bg-blue-400'}`}
                                            style={{ width: `${Math.min(100, totals.costTotals.hh.variancePercent || 100)}%` }}
                                          />
                                        </div>
                                      </div>

                                      {/* Hora Máquina (HM) Card */}
                                      <div className="bg-slate-900/90 border border-amber-900/50 rounded-lg p-2.5 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                                            Hora Máquina (HM)
                                          </span>
                                          <span className={`text-[11px] font-bold font-mono ${
                                            totals.costTotals.hm.varianceMin > 0 ? 'text-amber-400' : 'text-emerald-400'
                                          }`}>
                                            {totals.costTotals.hm.varianceMin > 0 ? `+${totals.costTotals.hm.varianceMin}m` : `${totals.costTotals.hm.varianceMin}m`}{' '}
                                            ({formatPercent(totals.costTotals.hm.variancePercent)})
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                                          <span>Standard: <strong className="text-slate-200">{totals.costTotals.hm.standardMin}m</strong></span>
                                          <span>Real: <strong className="text-white">{totals.costTotals.hm.realMin}m</strong></span>
                                        </div>
                                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                          <div
                                            className={`h-full ${totals.costTotals.hm.varianceMin > 0 ? 'bg-amber-400' : 'bg-amber-400'}`}
                                            style={{ width: `${Math.min(100, totals.costTotals.hm.variancePercent || 100)}%` }}
                                          />
                                        </div>
                                      </div>

                                      {/* GGF Card */}
                                      <div className="bg-slate-900/90 border border-purple-900/50 rounded-lg p-2.5 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-purple-300 font-mono flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                                            GGF (Gastos Gerais)
                                          </span>
                                          <span className={`text-[11px] font-bold font-mono ${
                                            totals.costTotals.ggf.varianceMin > 0 ? 'text-rose-400' : 'text-emerald-400'
                                          }`}>
                                            {totals.costTotals.ggf.varianceMin > 0 ? `+${totals.costTotals.ggf.varianceMin}m` : `${totals.costTotals.ggf.varianceMin}m`}{' '}
                                            ({formatPercent(totals.costTotals.ggf.variancePercent)})
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                                          <span>Standard: <strong className="text-slate-200">{totals.costTotals.ggf.standardMin}m</strong></span>
                                          <span>Real: <strong className="text-white">{totals.costTotals.ggf.realMin}m</strong></span>
                                        </div>
                                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                          <div
                                            className={`h-full ${totals.costTotals.ggf.varianceMin > 0 ? 'bg-rose-400' : 'bg-purple-400'}`}
                                            style={{ width: `${Math.min(100, totals.costTotals.ggf.variancePercent || 100)}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Clean Timeline comparison */}
                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                                  {PROCESS_STAGES.map((s) => {
                                    const stage = order.stages[s.id];
                                    const m = calcStageMetrics(
                                      stage,
                                      order.prepDate,
                                      s.id,
                                      driverRules,
                                      {
                                        scaleName: order.scaleName,
                                        bioreactorId: order.bioreactorId,
                                        allStages: order.stages,
                                        productName: order.productName,
                                      },
                                      varianceThresholds
                                    );
                                    const t = getStatusTheme(m.status);
                                    return (
                                      <div
                                        key={s.id}
                                        className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                                          m.isFilled
                                            ? `${t.bg} ${t.border}`
                                            : 'bg-slate-950 border-slate-800'
                                        }`}
                                      >
                                        <div>
                                          <div className="font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                                            <span>{s.label}</span>
                                            {m.isFilled && (
                                              <span className={`text-[10px] font-bold font-mono ${t.text}`}>
                                                {m.varianceMin > 0 ? `+${m.varianceMin}m` : `${m.varianceMin}m`}
                                              </span>
                                            )}
                                          </div>

                                          <div className="space-y-1 text-[11px] font-mono text-slate-400">
                                            <div className="flex justify-between">
                                              <span>Horários:</span>
                                              <span className="text-white truncate max-w-[110px]" title={stage?.startTime && stage?.endTime ? `${stage.startTime} → ${stage.endTime}` : '--:--'}>
                                                {stage?.startTime && stage?.endTime
                                                  ? `${stage.startTime} → ${stage.endTime}`
                                                  : '--:--'}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Standard:</span>
                                              <span>{stage?.standardMin || s.defaultStandardMin} min</span>
                                            </div>
                                            <div className="flex justify-between font-bold pt-1 border-t border-white/5">
                                              <span>Real:</span>
                                              <span className="text-white">
                                                {m.isFilled ? `${m.durationMin} min` : '--'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Per-stage HH, HM, GGF breakdown */}
                                        {m.costMetrics && (
                                          <div className="mt-2 pt-1.5 border-t border-white/10 space-y-1 font-mono text-[10px]">
                                            <div className="flex items-center justify-between text-blue-300">
                                              <span>HH:</span>
                                              <span>Std: {m.costMetrics.standard.hhMin}m | Real: <strong>{m.costMetrics.real.hhMin}m</strong></span>
                                            </div>
                                            <div className="flex items-center justify-between text-amber-300">
                                              <span>HM:</span>
                                              <span>Std: {m.costMetrics.standard.hmMin}m | Real: <strong>{m.costMetrics.real.hmMin}m</strong></span>
                                            </div>
                                            <div className="flex items-center justify-between text-purple-300">
                                              <span>GGF:</span>
                                              <span>Std: {m.costMetrics.standard.ggfMin}m | Real: <strong>{m.costMetrics.real.ggfMin}m</strong></span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Rastreabilidade e Variações da OP Mãe / Empenhada */}
                                {order.linkedOrder && order.linkedOrder.linkedOpNumber && (() => {
                                  const linkedParent = orders.find(
                                    (o) => o.id === order.linkedOrder?.linkedOrderId || o.opNumber === order.linkedOrder?.linkedOpNumber
                                  );
                                  const parentTotals = linkedParent ? calcOrderTotals(linkedParent, driverRules) : null;
                                  const parentTotalsTheme = parentTotals ? getStatusTheme(parentTotals.overallStatus) : null;

                                  return (
                                    <div className="p-3.5 bg-slate-950/95 rounded-xl border border-cyan-800/80 shadow-md space-y-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/50 pb-2.5">
                                        <div className="flex items-center space-x-2.5">
                                          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                            <LinkIcon className="w-4 h-4" />
                                          </div>
                                          <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                                                Rastreabilidade & Variações da OP Empenhada:
                                              </span>
                                              <button
                                                onClick={() => setSearchQuery(order.linkedOrder?.linkedOpNumber || '')}
                                                title="Filtrar por esta OP na grade"
                                                className="font-mono font-bold text-white text-xs bg-cyan-950 hover:bg-cyan-900 px-2 py-0.5 rounded border border-cyan-700/80 transition flex items-center gap-1"
                                              >
                                                <span>{order.linkedOrder.linkedOpNumber}</span>
                                                <ArrowRight className="w-3 h-3 text-cyan-400" />
                                              </button>
                                              {linkedParent && (
                                                <span className="text-xs text-slate-300 font-medium">
                                                  ({linkedParent.productName} • {linkedParent.bioreactorId} • {linkedParent.scaleName || `${linkedParent.batchVolumeLiters}L`})
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1 font-mono">
                                              <span className="flex items-center gap-1">
                                                <span>Relação:</span>
                                                <strong className="text-cyan-300 uppercase">
                                                  {order.linkedOrder.relationType === 'inoculo'
                                                    ? 'Inóculo / Batelada Mãe (Semente)'
                                                    : order.linkedOrder.relationType === 'transferencia'
                                                    ? 'Transferência de Volume'
                                                    : order.linkedOrder.relationType === 'filha'
                                                    ? 'Etapa Subsequente (Filha)'
                                                    : 'Empenho de Lote'}
                                                </strong>
                                              </span>

                                              {order.linkedOrder.volumeLiters !== undefined && (
                                                <span>
                                                  • Vol. Empenhado/Inoculado: <strong className="text-white">{order.linkedOrder.volumeLiters} L</strong>
                                                </span>
                                              )}

                                              {linkedParent?.operatorName && (
                                                <span>
                                                  • Operador: <strong className="text-slate-300">{linkedParent.operatorName}</strong>
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Resumo Consolidado do Desvio da OP Mãe */}
                                        {parentTotals && parentTotalsTheme && (
                                          <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs">
                                            <span className="text-slate-400 text-[10px]">Variação Total da OP Mãe:</span>
                                            <span className={`font-bold ${parentTotalsTheme.text}`}>
                                              {parentTotals.totalVarianceMin > 0 ? `+${parentTotals.totalVarianceMin}m` : `${parentTotals.totalVarianceMin}m`} ({formatPercent(parentTotals.totalVariancePercent)})
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${parentTotalsTheme.badge}`}>
                                              {parentTotalsTheme.label}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Grid com as Variações de CADA ETAPA da OP Empenhada */}
                                      {linkedParent ? (
                                        <div className="space-y-1.5">
                                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                            <span>Variações por Etapa da Batelada Mãe ({linkedParent.opNumber}):</span>
                                            <span className="text-[10px] text-slate-500 font-mono">
                                              Std Total: {parentTotals?.totalStandardMin}m | Real: {parentTotals?.totalRealMin}m
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                                            {PROCESS_STAGES.map((s) => {
                                              const st = linkedParent.stages[s.id];
                                              const m = calcStageMetrics(st, linkedParent.prepDate, s.id, driverRules, {
                                                scaleName: linkedParent.scaleName,
                                                bioreactorId: linkedParent.bioreactorId,
                                                allStages: linkedParent.stages,
                                                productName: linkedParent.productName,
                                              }, varianceThresholds);
                                              const t = getStatusTheme(m.status);
                                              return (
                                                <div
                                                  key={s.id}
                                                  className={`p-2.5 rounded-lg border text-xs ${
                                                    m.isFilled ? `${t.bg} ${t.border}` : 'bg-slate-900/60 border-slate-800 text-slate-500'
                                                  }`}
                                                >
                                                  <div className="flex items-center justify-between font-bold mb-1">
                                                    <span className="text-slate-200">{s.label}</span>
                                                    {m.isFilled ? (
                                                      <span className={`text-[11px] font-mono font-bold ${t.text}`}>
                                                        {m.varianceMin > 0 ? `+${m.varianceMin}m` : `${m.varianceMin}m`}
                                                      </span>
                                                    ) : (
                                                      <span className="text-[10px] text-slate-500">Pendente</span>
                                                    )}
                                                  </div>

                                                  <div className="space-y-0.5 text-[10px] font-mono text-slate-400">
                                                    <div className="flex justify-between">
                                                      <span>Horários:</span>
                                                      <span className="text-white">
                                                        {st?.startTime && st?.endTime ? `${st.startTime} → ${st.endTime}` : '--:--'}
                                                      </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span>Standard:</span>
                                                      <span>{st?.standardMin || s.defaultStandardMin}m</span>
                                                    </div>
                                                    <div className="flex justify-between font-semibold pt-0.5 border-t border-white/5 text-slate-200">
                                                      <span>Duração Real:</span>
                                                      <span>{m.isFilled ? `${m.durationMin}m` : '--'}</span>
                                                    </div>
                                                    {m.isFilled && (
                                                      <div className="flex justify-between items-center pt-0.5">
                                                        <span className="text-slate-400">Eficiência:</span>
                                                        <span className={`font-bold ${t.text}`}>{m.variancePercent.toFixed(1)}%</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-xs text-slate-400 font-mono py-1">
                                          <span>OP Vinculada referenciada ({order.linkedOrder.linkedOpNumber}), porém seus dados detalhados não estão presentes na lista ativa de ordens.</span>
                                        </div>
                                      )}

                                      {order.linkedOrder.notes && (
                                        <div className="text-[11px] text-slate-400 bg-slate-900/70 p-2 rounded-lg border border-slate-800/80">
                                          <strong className="text-slate-300">Obs do Vínculo: </strong>
                                          {order.linkedOrder.notes}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {order.notes && (
                                  <div className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                                    <strong className="text-slate-300">Observações: </strong>
                                    {order.notes}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: CLEAN CARDS VISUALIZATION */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
              <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
              <p className="text-sm font-semibold text-slate-400">
                Nenhuma ordem encontrada com os filtros aplicados.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const totals = calcOrderTotals(order, driverRules);
              const statusTheme = getStatusTheme(totals.overallStatus);

              return (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between shadow-lg transition-all"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-xs">
                          {order.bioreactorId}
                        </span>
                        <h4 className="font-bold text-white font-mono text-sm">
                          {order.opNumber}
                        </h4>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${statusTheme.badge}`}
                      >
                        {totals.completedStagesCount > 0
                          ? `${totals.totalVarianceMin > 0 ? `+${totals.totalVarianceMin}m` : `${totals.totalVarianceMin}m`} (${formatPercent(totals.totalVariancePercent)})`
                          : 'Pendente'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-2">
                      <p className="text-xs text-slate-300 font-medium truncate" title={order.productName}>
                        {order.productName}
                      </p>
                      {order.scaleName && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700 shrink-0">
                          {order.scaleName}
                        </span>
                      )}
                      {order.linkedOrder && order.linkedOrder.linkedOpNumber && (
                        <span
                          className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-bold flex items-center gap-1 shrink-0"
                          title={`Vinculada à OP ${order.linkedOrder.linkedOpNumber}`}
                        >
                          <LinkIcon className="w-2.5 h-2.5" />
                          <span>{order.linkedOrder.linkedOpNumber}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono py-1.5 border-y border-slate-800/80 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{order.prepDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[100px]">{order.operatorName}</span>
                      </div>
                    </div>

                    {/* Stage Step Indicators */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Progresso do Processo</span>
                        <span>{totals.completedStagesCount} / 5 etapas</span>
                      </div>

                      <div className="grid grid-cols-5 gap-1">
                        {PROCESS_STAGES.map((s) => {
                          const stage = order.stages[s.id];
                          const m = calcStageMetrics(stage, order.prepDate, s.id, driverRules, {
                            scaleName: order.scaleName,
                            bioreactorId: order.bioreactorId,
                            allStages: order.stages,
                            productName: order.productName,
                          }, varianceThresholds);
                          const t = getStatusTheme(m.status);
                          return (
                            <div
                              key={s.id}
                              title={`${s.label}: ${m.isFilled ? `${m.durationMin}m (${m.varianceMin > 0 ? `+${m.varianceMin}` : m.varianceMin}m)` : 'Pendente'}`}
                              className={`h-2 rounded-sm transition-all ${
                                m.isFilled ? t.pill : 'bg-slate-800'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Stage Breakdown Badges */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-[11px] font-mono mb-3">
                      {PROCESS_STAGES.map((s) => {
                        const stage = order.stages[s.id];
                        const m = calcStageMetrics(stage, order.prepDate, s.id, driverRules, {
                          scaleName: order.scaleName,
                          bioreactorId: order.bioreactorId,
                          allStages: order.stages,
                          productName: order.productName,
                        });
                        const t = getStatusTheme(m.status);
                        return (
                          <div
                            key={s.id}
                            className={`p-1.5 rounded border flex flex-col justify-between ${
                              m.isFilled ? `${t.bg} ${t.border}` : 'bg-slate-950/60 border-slate-800 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{s.shortLabel}</span>
                              <span className="font-bold">
                                {m.isFilled ? `${m.durationMin}m` : '--'}
                              </span>
                            </div>
                            {m.costMetrics && m.isFilled && (
                              <div className="flex items-center justify-between text-[8px] text-slate-400 pt-0.5 mt-0.5 border-t border-white/5">
                                <span className="text-blue-300">HH:{m.costMetrics.real.hhMin}m</span>
                                <span className="text-amber-300">HM:{m.costMetrics.real.hmMin}m</span>
                                <span className="text-purple-300">GGF:{m.costMetrics.real.ggfMin}m</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Consolidated Cost Drivers Pill (HH, HM, GGF) in Card */}
                    {totals.costTotals && (
                      <div className="mb-3 bg-slate-950/90 p-2 rounded-lg border border-slate-800 flex flex-col gap-1.5 text-[10px] font-mono">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 border-b border-slate-800/80 pb-1">
                          <span>DIRECIONADORES DE CUSTO</span>
                          <span>VARIAÇÃO (MIN & %)</span>
                        </div>
                        <div className="flex items-center justify-between text-blue-300">
                          <span>HH: <strong>{totals.costTotals.hh.realMin}m</strong> <span className="text-[9px] text-slate-500">(std {totals.costTotals.hh.standardMin}m)</span></span>
                          <span className={`font-bold ${totals.costTotals.hh.varianceMin > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {totals.costTotals.hh.varianceMin > 0 ? `+${totals.costTotals.hh.varianceMin}m` : `${totals.costTotals.hh.varianceMin}m`} ({formatPercent(totals.costTotals.hh.variancePercent)})
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-amber-300">
                          <span>HM: <strong>{totals.costTotals.hm.realMin}m</strong> <span className="text-[9px] text-slate-500">(std {totals.costTotals.hm.standardMin}m)</span></span>
                          <span className={`font-bold ${totals.costTotals.hm.varianceMin > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {totals.costTotals.hm.varianceMin > 0 ? `+${totals.costTotals.hm.varianceMin}m` : `${totals.costTotals.hm.varianceMin}m`} ({formatPercent(totals.costTotals.hm.variancePercent)})
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-purple-300">
                          <span>GGF: <strong>{totals.costTotals.ggf.realMin}m</strong> <span className="text-[9px] text-slate-500">(std {totals.costTotals.ggf.standardMin}m)</span></span>
                          <span className={`font-bold ${totals.costTotals.ggf.varianceMin > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {totals.costTotals.ggf.varianceMin > 0 ? `+${totals.costTotals.ggf.varianceMin}m` : `${totals.costTotals.ggf.varianceMin}m`} ({formatPercent(totals.costTotals.ggf.variancePercent)})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Linked Parent OP Stage Variations Preview in Card */}
                    {order.linkedOrder && order.linkedOrder.linkedOpNumber && (() => {
                      const linkedParent = orders.find(
                        (o) => o.id === order.linkedOrder?.linkedOrderId || o.opNumber === order.linkedOrder?.linkedOpNumber
                      );
                      const pTotals = linkedParent ? calcOrderTotals(linkedParent, driverRules) : null;
                      const pTheme = pTotals ? getStatusTheme(pTotals.overallStatus) : null;

                      return (
                        <div className="mb-3">
                          <div className="bg-slate-950/90 p-2 rounded-lg border border-cyan-900/60 flex flex-col gap-1.5 text-[11px] font-mono">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-cyan-300 font-bold text-[10px] uppercase">
                                <LinkIcon className="w-3 h-3 text-cyan-400" />
                                <span>OP Mãe: {order.linkedOrder.linkedOpNumber}</span>
                              </span>
                              {pTotals && pTheme && (
                                <span className={`text-[10px] font-bold px-1 rounded ${pTheme.badge}`}>
                                  Desvio: {pTotals.totalVarianceMin > 0 ? `+${pTotals.totalVarianceMin}m` : `${pTotals.totalVarianceMin}m`}
                                </span>
                              )}
                            </div>
                            {linkedParent && (
                              <div className="grid grid-cols-5 gap-1 text-[9px] pt-1 border-t border-slate-800/80">
                                {PROCESS_STAGES.map((s) => {
                                  const st = linkedParent.stages[s.id];
                                  const m = calcStageMetrics(st, linkedParent.prepDate, s.id, driverRules, {
                                    scaleName: linkedParent.scaleName,
                                    bioreactorId: linkedParent.bioreactorId,
                                    allStages: linkedParent.stages,
                                    productName: linkedParent.productName,
                                  });
                                  const t = getStatusTheme(m.status);
                                  return (
                                    <div
                                      key={s.id}
                                      className={`px-1 py-0.5 rounded text-center border ${
                                        m.isFilled ? `${t.bg} ${t.border}` : 'bg-slate-900 border-slate-800 text-slate-500'
                                      }`}
                                    >
                                      <div className="text-slate-400 font-bold">{s.shortLabel}</div>
                                      <div className={`font-bold ${t.text}`}>
                                        {m.isFilled ? (m.varianceMin > 0 ? `+${m.varianceMin}m` : `${m.varianceMin}m`) : '--'}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Card Footer: Totals & Action Buttons */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div className="text-xs font-mono">
                      <span className="text-slate-500 text-[10px]">TOTAL: </span>
                      <strong className="text-white">
                        {totals.completedStagesCount > 0 ? formatMinutes(totals.totalRealMin) : '--'}
                      </strong>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onEditOrderModal(order)}
                        title="Editar OP"
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicateOrder(order)}
                        title="Duplicar OP"
                        className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setOrderToDelete(order)}
                        title="Excluir OP"
                        className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Confirmation Modal: Single Order Deletion */}
      <ConfirmModal
        isOpen={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        onConfirm={() => {
          if (orderToDelete) {
            onDeleteOrder(orderToDelete.id);
            setOrderToDelete(null);
          }
        }}
        title="Excluir Ordem de Produção"
        itemName={orderToDelete ? `${orderToDelete.opNumber} • ${orderToDelete.productName}` : undefined}
        message="Tem certeza que deseja excluir esta ordem de produção? Todos os tempos apontados e desvios desta batelada serão removidos permanentemente."
        confirmLabel="Excluir Ordem"
      />

      {/* Confirmation Modal: Bulk Deletion */}
      <ConfirmModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => {
          selectedOrderIds.forEach((id) => onDeleteOrder(id));
          setSelectedOrderIds(new Set());
          setBulkDeleteOpen(false);
        }}
        title="Excluir Ordens Selecionadas"
        message={`Tem certeza que deseja excluir em lote as ${selectedOrderIds.size} ordens de produção selecionadas? Esta ação não poderá ser desfeita.`}
        confirmLabel={`Excluir ${selectedOrderIds.size} Ordens`}
      />
    </div>
  );
};
