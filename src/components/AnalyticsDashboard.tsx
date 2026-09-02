import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  Flame,
  Package,
  Cpu,
  Calendar,
  Users,
} from 'lucide-react';
import { ProcessStageId, PROCESS_STAGES, ProductionOrder, BioreactorItem, OperatorItem, ProductPreset, CostDriverRule, VarianceThresholdConfig } from '../types';
import { calcStageMetrics, calcOrderTotals, formatMinutes, formatPercent } from '../utils/calculations';
import { BIOREACTOR_LIST, OPERATOR_LIST, PRODUCT_PRESETS } from '../utils/mockData';

interface AnalyticsDashboardProps {
  orders: ProductionOrder[];
  bioreactors?: BioreactorItem[];
  operators?: OperatorItem[];
  products?: ProductPreset[];
  driverRules?: CostDriverRule[];
  varianceThresholds?: VarianceThresholdConfig;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  orders,
  bioreactors = [],
  operators = [],
  products = [],
  driverRules,
  varianceThresholds,
}) => {
  // Global Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedBioreactor, setSelectedBioreactor] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedOperator, setSelectedOperator] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

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

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.prepDate) {
        const y = o.prepDate.split('-')[0];
        if (y && y.length === 4) set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  const monthNames = [
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

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (dateFrom && order.prepDate < dateFrom) return false;
      if (dateTo && order.prepDate > dateTo) return false;
      if (selectedYear !== 'all') {
        const y = order.prepDate?.split('-')[0];
        if (y !== selectedYear) return false;
      }
      if (selectedMonth !== 'all') {
        const m = order.prepDate?.split('-')[1];
        if (m !== selectedMonth) return false;
      }
      if (selectedBioreactor !== 'all' && order.bioreactorId !== selectedBioreactor) return false;
      if (selectedProduct !== 'all' && order.productName !== selectedProduct) return false;
      if (selectedOperator !== 'all' && order.operatorName !== selectedOperator) return false;
      return true;
    });
  }, [orders, dateFrom, dateTo, selectedYear, selectedMonth, selectedBioreactor, selectedProduct, selectedOperator]);

  // KPI Calculations
  const kpis = useMemo(() => {
    if (filteredOrders.length === 0) {
      return {
        avgRealDuration: 0,
        avgStandardDuration: 0,
        avgVariancePercent: 0,
        avgVarianceMin: 0,
        criticalStageName: 'Nenhuma',
        criticalStageTotalDelayMin: 0,
        adherencePercent: 0,
        totalCompletedOrders: 0,
      };
    }

    let totalRealMin = 0;
    let totalStdMin = 0;
    let onTimeCount = 0;
    let completedCount = 0;

    const stageDelays: Record<ProcessStageId, number> = { setup: 0, abastecimento: 0, preparo: 0, multiplicacao: 0 };

    filteredOrders.forEach((order) => {
      const totals = calcOrderTotals(order, driverRules, varianceThresholds);
      if (totals.completedStagesCount > 0) {
        totalRealMin += totals.totalRealMin;
        totalStdMin += totals.totalStandardMin;
        completedCount++;

        if (totals.overallStatus === 'ok') {
          onTimeCount++;
        }
      }

      PROCESS_STAGES.forEach((s) => {
        const m = calcStageMetrics(
          order.stages?.[s.id],
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
        if (m.isFilled) {
          stageDelays[s.id] = (stageDelays[s.id] || 0) + Math.max(0, m.varianceMin);
        }
      });
    });

    const avgRealDuration = completedCount > 0 ? totalRealMin / completedCount : 0;
    const avgStandardDuration = completedCount > 0 ? totalStdMin / completedCount : 0;
    const totalVarianceMin = totalRealMin - totalStdMin;
    const avgVarianceMin = completedCount > 0 ? totalVarianceMin / completedCount : 0;
    const avgVariancePercent = totalRealMin > 0 ? (totalStdMin / totalRealMin) * 100 : 0;
    const adherencePercent = completedCount > 0 ? (onTimeCount / completedCount) * 100 : 0;

    let maxDelay = -1;
    let criticalStageId: ProcessStageId = 'setup';
    Object.entries(stageDelays).forEach(([stId, delay]) => {
      if (delay > maxDelay) {
        maxDelay = delay;
        criticalStageId = stId as ProcessStageId;
      }
    });

    const critStageDef = PROCESS_STAGES.find((s) => s.id === criticalStageId);

    return {
      avgRealDuration,
      avgStandardDuration,
      avgVariancePercent,
      avgVarianceMin,
      criticalStageName: critStageDef ? critStageDef.label : 'N/A',
      criticalStageTotalDelayMin: maxDelay > 0 ? maxDelay : 0,
      adherencePercent,
      totalCompletedOrders: completedCount,
    };
  }, [filteredOrders]);

  // --- 1. MONTHLY VARIATION TREND ---
  const monthlyTrendData = useMemo(() => {
    const monthMap: Record<
      string,
      {
        monthKey: string;
        label: string;
        totalVarianceMin: number;
        totalRealMin: number;
        totalStdMin: number;
        count: number;
        bottlenecks: number;
      }
    > = {};

    const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    filteredOrders.forEach((order) => {
      const dateStr = order.prepDate || '';
      const [year, month] = dateStr.split('-');
      if (year && month) {
        const key = `${year}-${month}`;
        const monthIndex = parseInt(month, 10) - 1;
        const label = `${shortMonths[monthIndex] || month}/${year.slice(2)}`;
        if (!monthMap[key]) {
          monthMap[key] = {
            monthKey: key,
            label,
            totalVarianceMin: 0,
            totalRealMin: 0,
            totalStdMin: 0,
            count: 0,
            bottlenecks: 0,
          };
        }
        const t = calcOrderTotals(order, driverRules, varianceThresholds);
        monthMap[key].totalVarianceMin += t.totalVarianceMin;
        monthMap[key].totalRealMin += t.totalRealMin;
        monthMap[key].totalStdMin += t.totalStandardMin;
        monthMap[key].count++;
        if (t.overallStatus === 'critical') monthMap[key].bottlenecks++;
      }
    });

    return Object.values(monthMap)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((m) => {
        const avgVarianceMin = Math.round(m.totalVarianceMin / m.count);
        const adherence = m.totalRealMin > 0 ? Math.round((m.totalStdMin / m.totalRealMin) * 100) : 100;
        return {
          month: m.label,
          'Desvio Médio (min)': avgVarianceMin,
          'Aderência ao Standard (%)': adherence,
          totalVarianceMin: m.totalVarianceMin,
          count: m.count,
          bottlenecks: m.bottlenecks,
        };
      });
  }, [filteredOrders, driverRules, varianceThresholds]);

  // --- 2. BIOREACTOR & STAGE VARIATION MATRIX (QUAL BIORREATOR E ETAPA VARIA MAIS) ---
  const bioreactorStageData = useMemo(() => {
    const bioMap: Record<
      string,
      {
        bioreactorId: string;
        stageVariances: Record<ProcessStageId, number>;
        totalVariance: number;
        count: number;
      }
    > = {};

    filteredOrders.forEach((order) => {
      const bioId = order.bioreactorId;
      if (!bioMap[bioId]) {
        bioMap[bioId] = {
          bioreactorId: bioId,
          stageVariances: {
            setup: 0,
            abastecimento: 0,
            preparo: 0,
            multiplicacao: 0,
          },
          totalVariance: 0,
          count: 0,
        };
      }

      bioMap[bioId].count++;

      PROCESS_STAGES.forEach((stage) => {
        const m = calcStageMetrics(
          order.stages?.[stage.id],
          order.prepDate,
          stage.id,
          driverRules,
          {
            scaleName: order.scaleName,
            bioreactorId: order.bioreactorId,
            allStages: order.stages,
            productName: order.productName,
          },
          varianceThresholds
        );
        if (m.isFilled) {
          const varMin = Math.max(0, m.varianceMin);
          bioMap[bioId].stageVariances[stage.id] = (bioMap[bioId].stageVariances[stage.id] || 0) + varMin;
          bioMap[bioId].totalVariance += varMin;
        }
      });
    });

    return Object.values(bioMap)
      .filter((b) => b.count > 0)
      .map((b) => ({
        bioreactor: b.bioreactorId,
        '1. Setup': Math.round((b.stageVariances.setup || 0) / b.count),
        '2. Abastecimento': Math.round((b.stageVariances.abastecimento || 0) / b.count),
        '3. Preparo': Math.round((b.stageVariances.preparo || 0) / b.count),
        '4. Multiplicação': Math.round((b.stageVariances.multiplicacao || 0) / b.count),
        totalAvgVariance: Math.round(b.totalVariance / b.count),
        count: b.count,
      }))
      .sort((a, b) => b.totalAvgVariance - a.totalAvgVariance);
  }, [filteredOrders, driverRules]);

  // --- 3. PRODUCT VARIATION BREAKDOWN ---
  const productVarianceData = useMemo(() => {
    const prodMap: Record<
      string,
      { totalVarianceMin: number; totalRealMin: number; totalStdMin: number; count: number; bottlenecks: number }
    > = {};

    filteredOrders.forEach((order) => {
      const pName = order.productName || 'Não especificado';
      if (!prodMap[pName]) {
        prodMap[pName] = { totalVarianceMin: 0, totalRealMin: 0, totalStdMin: 0, count: 0, bottlenecks: 0 };
      }
      const t = calcOrderTotals(order, driverRules, varianceThresholds);
      prodMap[pName].totalVarianceMin += t.totalVarianceMin;
      prodMap[pName].totalRealMin += t.totalRealMin;
      prodMap[pName].totalStdMin += t.totalStandardMin;
      prodMap[pName].count++;
      if (t.overallStatus === 'critical') prodMap[pName].bottlenecks++;
    });

    return Object.entries(prodMap)
      .map(([productName, data]) => {
        const avgVarianceMin = Math.round(data.totalVarianceMin / data.count);
        const adherence = data.totalRealMin > 0 ? Math.round((data.totalStdMin / data.totalRealMin) * 100) : 100;
        return {
          productName,
          'Desvio Médio (min)': avgVarianceMin,
          'Aderência (%)': adherence,
          count: data.count,
          bottlenecks: data.bottlenecks,
        };
      })
      .sort((a, b) => b['Desvio Médio (min)'] - a['Desvio Médio (min)']);
  }, [filteredOrders, driverRules, varianceThresholds]);

  // --- 4. OPERATOR PERFORMANCE RANKING ---
  const operatorRankingData = useMemo(() => {
    const opMap: Record<string, { totalVarianceMin: number; totalRealMin: number; totalStdMin: number; count: number }> = {};
    filteredOrders.forEach((order) => {
      const op = order.operatorName || 'Não atribuído';
      if (!opMap[op]) {
        opMap[op] = { totalVarianceMin: 0, totalRealMin: 0, totalStdMin: 0, count: 0 };
      }
      const t = calcOrderTotals(order, driverRules, varianceThresholds);
      opMap[op].totalVarianceMin += t.totalVarianceMin;
      opMap[op].totalRealMin += t.totalRealMin;
      opMap[op].totalStdMin += t.totalStandardMin;
      opMap[op].count++;
    });

    return Object.entries(opMap)
      .map(([operator, data]) => {
        const avgVarianceMin = Math.round(data.totalVarianceMin / data.count);
        const adherence = data.totalRealMin > 0 ? Math.round((data.totalStdMin / data.totalRealMin) * 100) : 100;
        return {
          operator,
          avgVarianceMin,
          adherence,
          count: data.count,
        };
      })
      .sort((a, b) => b.adherence - a.adherence);
  }, [filteredOrders, driverRules, varianceThresholds]);

  // --- 5. COST DRIVERS CONSOLIDATION (HH, HM, GGF) ---
  const costDriversData = useMemo(() => {
    let totalHhStd = 0;
    let totalHhReal = 0;
    let totalHmStd = 0;
    let totalHmReal = 0;
    let totalGgfStd = 0;
    let totalGgfReal = 0;
    let count = 0;

    const stageBreakdown: Record<ProcessStageId, { hhStd: number; hhReal: number; hmStd: number; hmReal: number; ggfStd: number; ggfReal: number }> = {
      setup: { hhStd: 0, hhReal: 0, hmStd: 0, hmReal: 0, ggfStd: 0, ggfReal: 0 },
      abastecimento: { hhStd: 0, hhReal: 0, hmStd: 0, hmReal: 0, ggfStd: 0, ggfReal: 0 },
      preparo: { hhStd: 0, hhReal: 0, hmStd: 0, hmReal: 0, ggfStd: 0, ggfReal: 0 },
      multiplicacao: { hhStd: 0, hhReal: 0, hmStd: 0, hmReal: 0, ggfStd: 0, ggfReal: 0 },
    };

    filteredOrders.forEach((order) => {
      const totals = calcOrderTotals(order, driverRules, varianceThresholds);
      if (totals.completedStagesCount > 0 && totals.costTotals) {
        totalHhStd += totals.costTotals.hh.standardMin;
        totalHhReal += totals.costTotals.hh.realMin;
        totalHmStd += totals.costTotals.hm.standardMin;
        totalHmReal += totals.costTotals.hm.realMin;
        totalGgfStd += totals.costTotals.ggf.standardMin;
        totalGgfReal += totals.costTotals.ggf.realMin;
        count++;

        PROCESS_STAGES.forEach((s) => {
          const m = calcStageMetrics(
            order.stages?.[s.id],
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
          if (m.isFilled && m.costMetrics) {
            if (!stageBreakdown[s.id]) {
              stageBreakdown[s.id] = { hhStd: 0, hhReal: 0, hmStd: 0, hmReal: 0, ggfStd: 0, ggfReal: 0 };
            }
            stageBreakdown[s.id].hhStd += m.costMetrics.standard.hhMin;
            stageBreakdown[s.id].hhReal += m.costMetrics.real.hhMin;
            stageBreakdown[s.id].hmStd += m.costMetrics.standard.hmMin;
            stageBreakdown[s.id].hmReal += m.costMetrics.real.hmMin;
            stageBreakdown[s.id].ggfStd += m.costMetrics.standard.ggfMin;
            stageBreakdown[s.id].ggfReal += m.costMetrics.real.ggfMin;
          }
        });
      }
    });

    const stageChart = PROCESS_STAGES.map((s) => ({
      stageName: s.shortLabel,
      'HH Real': stageBreakdown[s.id]?.hhReal || 0,
      'HH Standard': stageBreakdown[s.id]?.hhStd || 0,
      'HM Real': stageBreakdown[s.id]?.hmReal || 0,
      'HM Standard': stageBreakdown[s.id]?.hmStd || 0,
      'GGF Real': stageBreakdown[s.id]?.ggfReal || 0,
      'GGF Standard': stageBreakdown[s.id]?.ggfStd || 0,
    }));

    return {
      totalHhStd,
      totalHhReal,
      hhVariance: totalHhReal - totalHhStd,
      totalHmStd,
      totalHmReal,
      hmVariance: totalHmReal - totalHmStd,
      totalGgfStd,
      totalGgfReal,
      ggfVariance: totalGgfReal - totalGgfStd,
      count,
      stageChart,
    };
  }, [filteredOrders, driverRules]);

  return (
    <div className="space-y-6">
      {/* Global Filters Section */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Filter className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
              Filtros Globais de Análise
            </h3>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
            <span>
              Filtrando <span className="text-cyan-300 font-bold">{filteredOrders.length}</span> de{' '}
              <span className="text-white font-bold">{orders.length}</span> bateladas
            </span>
            {(dateFrom || dateTo || selectedYear !== 'all' || selectedMonth !== 'all' || selectedBioreactor !== 'all' || selectedProduct !== 'all' || selectedOperator !== 'all') && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setSelectedYear('all');
                  setSelectedMonth('all');
                  setSelectedBioreactor('all');
                  setSelectedProduct('all');
                  setSelectedOperator('all');
                }}
                className="text-cyan-400 hover:text-cyan-300 underline font-medium"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
          {/* Mês Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" />
              Mês
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">Todos os Meses</option>
              {monthNames.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ano Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Ano
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
            >
              <option value="all">Todos os Anos</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Bioreactor Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              Biorreator
            </label>
            <select
              value={selectedBioreactor}
              onChange={(e) => setSelectedBioreactor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">Todos Biorreatores</option>
              {availableBioreactors.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Package className="w-3 h-3 text-cyan-400" />
              Produto
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none truncate"
            >
              <option value="all">Todos Produtos</option>
              {availableProducts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" />
              Operador
            </label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">Todos Operadores</option>
              {availableOperators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Data Específica De/Até
            </label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-1/2 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-white focus:border-cyan-500 focus:outline-none"
                title="Data Inicial"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-1/2 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-white focus:border-cyan-500 focus:outline-none"
                title="Data Final"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Mandatory KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tempo Total Médio por Batelada */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Tempo Médio / Batelada
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono-num text-white mt-1">
            {formatMinutes(kpis.avgRealDuration)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>Standard Médio:</span>
            <span className="font-mono-num font-semibold text-slate-300">
              {formatMinutes(kpis.avgStandardDuration)}
            </span>
          </div>
        </div>

        {/* KPI 2: Variação Média Geral */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Variação Média Geral
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                kpis.avgVarianceMin > 30
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  : kpis.avgVarianceMin > 0
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold font-mono-num mt-1 ${
              kpis.avgVarianceMin > 30
                ? 'text-rose-400'
                : kpis.avgVarianceMin > 0
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {kpis.avgVarianceMin > 0 ? `+${Math.round(kpis.avgVarianceMin)} min` : `${Math.round(kpis.avgVarianceMin)} min`}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>Impacto em tempo:</span>
            <span className="font-mono-num font-semibold text-slate-300">
              {formatMinutes(Math.abs(kpis.avgVarianceMin))}
            </span>
          </div>
        </div>

        {/* KPI 3: Etapa Crítica */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Etapa Crítica (Maior Desvio)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-rose-300 truncate mt-1" title={kpis.criticalStageName}>
            {kpis.criticalStageName}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>Atraso acumulado:</span>
            <span className="font-mono-num font-semibold text-rose-400">
              +{kpis.criticalStageTotalDelayMin} min ({formatMinutes(kpis.criticalStageTotalDelayMin)})
            </span>
          </div>
        </div>

        {/* KPI 4: Aderência ao Padrão */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Aderência ao Padrão
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono-num text-emerald-400 mt-1">
            {kpis.adherencePercent.toFixed(1)}%
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>Ordens no Standard:</span>
            <span className="font-mono-num font-semibold text-slate-300">
              {Math.round((kpis.adherencePercent / 100) * kpis.totalCompletedOrders)} de {kpis.totalCompletedOrders}
            </span>
          </div>
        </div>
      </div>

      {/* --- GRÁFICOS SOLICITADOS --- */}
      <div className="space-y-6">
        {/* GRÁFICO 1: Variações ao Longo dos Meses */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Variação & Aderência ao Longo dos Meses
              </h4>
              <p className="text-xs text-slate-400">
                Evolução mensal do desvio médio de tempo (minutos) e percentual de aderência ao standard
              </p>
            </div>
            <span className="text-[11px] font-mono bg-cyan-950/60 text-cyan-400 px-2.5 py-1 rounded-md border border-cyan-800/50">
              Evolução Temporal Mensal
            </span>
          </div>

          <div className="h-[300px] w-full pt-2">
            {monthlyTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Nenhum dado encontrado para o período selecionado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="varGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="adhGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#f43f5e" tick={{ fontSize: 11 }} unit="m" />
                  <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" tick={{ fontSize: 11 }} unit="%" domain={[0, 150]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Desvio Médio (min)') return [`${value} min (${formatMinutes(Number(value))})`, name];
                      if (name === 'Aderência ao Standard (%)') return [`${value}%`, name];
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="Desvio Médio (min)"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#varGradient)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="Aderência ao Standard (%)"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#adhGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2 Gráficos lado a lado: Biorreator x Etapas & Variações por Produto */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* GRÁFICO 2: Qual Biorreator e Qual Etapa Varia Mais */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  Qual Biorreator e Etapa Varia Mais
                </h4>
                <p className="text-xs text-slate-400">
                  Desvio médio empilhado por etapa em cada biorreator (minutos adicionais)
                </p>
              </div>
            </div>

            <div className="h-[300px] w-full pt-2">
              {bioreactorStageData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Nenhum dado registrado para os biorreatores selecionados.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bioreactorStageData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="bioreactor" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="m" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: string) => [
                        `${value} min (${formatMinutes(Number(value))})`,
                        name,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="1. Setup" stackId="a" fill="#06b6d4" />
                    <Bar dataKey="2. Abastecimento" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="3. Preparo" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="4. Multiplicação" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* GRÁFICO 3: Variações por Produto */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  Variações por Produto
                </h4>
                <p className="text-xs text-slate-400">
                  Desvio médio de tempo por formulação/produto fabricado
                </p>
              </div>
            </div>

            <div className="h-[300px] w-full pt-2">
              {productVarianceData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Nenhum dado registrado para produtos.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={productVarianceData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 60, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} unit="m" />
                    <YAxis dataKey="productName" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: string) => [
                        `${value} min (${formatMinutes(Number(value))})`,
                        'Desvio Médio',
                      ]}
                    />
                    <Bar
                      dataKey="Desvio Médio (min)"
                      radius={[0, 4, 4, 0]}
                    >
                      {productVarianceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry['Desvio Médio (min)'] > 60 ? '#f43f5e' : entry['Desvio Médio (min)'] > 0 ? '#f59e0b' : '#10b981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Seção Complementar: Ranking de Performance por Operador */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Performance & Aderência por Operador
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              Classificado por Aderência ao Standard
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800 font-mono">
                <tr>
                  <th className="px-4 py-2.5">Operador</th>
                  <th className="px-4 py-2.5 text-center">Bateladas</th>
                  <th className="px-4 py-2.5 text-right">Desvio Médio</th>
                  <th className="px-4 py-2.5 text-right">Aderência ao Standard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {operatorRankingData.map((op) => (
                  <tr key={op.operator} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-medium text-slate-200">{op.operator}</td>
                    <td className="px-4 py-3 text-center text-slate-300 font-mono">{op.count}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={op.avgVarianceMin > 30 ? 'text-rose-400' : op.avgVarianceMin > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        {op.avgVarianceMin > 0 ? `+${op.avgVarianceMin} min` : `${op.avgVarianceMin} min`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        op.adherence >= 90 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        op.adherence >= 70 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {op.adherence}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seção Exclusiva: Direcionadores de Custo (HH, HM, GGF) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Análise Consolidada dos Direcionadores de Custo (HH, HM, GGF)
              </h4>
              <p className="text-xs text-slate-400">
                Totais acumulados de Standard vs Real e Desvios apurados por tipo de recurso (Regra de Tempo Fixo)
              </p>
            </div>
            <span className="text-[11px] font-mono bg-blue-950/60 text-blue-300 px-2.5 py-1 rounded-md border border-blue-800/50">
              Regra 2 (Independente)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* HH Card */}
            {(() => {
              const hhPercent = costDriversData.totalHhReal > 0 ? (costDriversData.totalHhStd / costDriversData.totalHhReal) * 100 : (costDriversData.count === 0 ? 100 : 0);
              return (
                <div className="bg-slate-950/80 border border-blue-900/50 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 font-mono flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                      Hora Homem (HH)
                    </span>
                    <span className={`text-xs font-bold font-mono ${costDriversData.hhVariance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {costDriversData.hhVariance > 0 ? `+${costDriversData.hhVariance} min` : `${costDriversData.hhVariance} min`}{' '}
                      ({formatPercent(hhPercent)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
                    <span>Total Real: <strong className="text-white">{formatMinutes(costDriversData.totalHhReal)}</strong></span>
                    <span className="text-slate-400">Std: {formatMinutes(costDriversData.totalHhStd)}</span>
                  </div>
                </div>
              );
            })()}

            {/* HM Card */}
            {(() => {
              const hmPercent = costDriversData.totalHmReal > 0 ? (costDriversData.totalHmStd / costDriversData.totalHmReal) * 100 : (costDriversData.count === 0 ? 100 : 0);
              return (
                <div className="bg-slate-950/80 border border-amber-900/50 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      Hora Máquina (HM)
                    </span>
                    <span className={`text-xs font-bold font-mono ${costDriversData.hmVariance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {costDriversData.hmVariance > 0 ? `+${costDriversData.hmVariance} min` : `${costDriversData.hmVariance} min`}{' '}
                      ({formatPercent(hmPercent)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
                    <span>Total Real: <strong className="text-white">{formatMinutes(costDriversData.totalHmReal)}</strong></span>
                    <span className="text-slate-400">Std: {formatMinutes(costDriversData.totalHmStd)}</span>
                  </div>
                </div>
              );
            })()}

            {/* GGF Card */}
            {(() => {
              const ggfPercent = costDriversData.totalGgfReal > 0 ? (costDriversData.totalGgfStd / costDriversData.totalGgfReal) * 100 : (costDriversData.count === 0 ? 100 : 0);
              return (
                <div className="bg-slate-950/80 border border-purple-900/50 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 font-mono flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                      GGF (Gastos Gerais)
                    </span>
                    <span className={`text-xs font-bold font-mono ${costDriversData.ggfVariance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {costDriversData.ggfVariance > 0 ? `+${costDriversData.ggfVariance} min` : `${costDriversData.ggfVariance} min`}{' '}
                      ({formatPercent(ggfPercent)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
                    <span>Total Real: <strong className="text-white">{formatMinutes(costDriversData.totalGgfReal)}</strong></span>
                    <span className="text-slate-400">Std: {formatMinutes(costDriversData.totalGgfStd)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
