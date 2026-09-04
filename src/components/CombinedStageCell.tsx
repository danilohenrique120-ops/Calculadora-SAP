import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Check,
  X,
  Moon,
  Plus,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { StageRecord, CostDriverRule, VarianceThresholdConfig } from '../types';
import {
  calcCombinedAbastecimentoPreparoMetrics,
  formatMinutes,
  formatPercent,
  getStatusTheme,
} from '../utils/calculations';

interface CombinedStageCellProps {
  abastRecord?: StageRecord;
  prepRecord?: StageRecord;
  prepDate?: string;
  orderProductName?: string;
  orderScaleName?: string;
  orderStages?: Record<string, StageRecord>;
  onUpdateAbastecimento: (updated: Partial<StageRecord>) => void;
  onUpdatePreparo: (updated: Partial<StageRecord>) => void;
  directEditMode?: boolean;
  driverRules?: CostDriverRule[];
  varianceThresholds?: VarianceThresholdConfig;
}

export const CombinedStageCell: React.FC<CombinedStageCellProps> = ({
  abastRecord,
  prepRecord,
  prepDate,
  orderProductName,
  orderScaleName,
  orderStages,
  onUpdateAbastecimento,
  onUpdatePreparo,
  directEditMode = false,
  driverRules,
  varianceThresholds,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'abastecimento' | 'preparo'>('abastecimento');

  // Abastecimento local states
  const [abastStartDate, setAbastStartDate] = useState(abastRecord?.startDate || prepDate || '');
  const [abastStart, setAbastStart] = useState(abastRecord?.startTime || '');
  const [abastEndDate, setAbastEndDate] = useState(abastRecord?.endDate || abastRecord?.startDate || prepDate || '');
  const [abastEnd, setAbastEnd] = useState(abastRecord?.endTime || '');

  // Preparo local states
  const [prepStartDate, setPrepStartDate] = useState(prepRecord?.startDate || prepDate || '');
  const [prepStart, setPrepStart] = useState(prepRecord?.startTime || '');
  const [prepEndDate, setPrepEndDate] = useState(prepRecord?.endDate || prepRecord?.startDate || prepDate || '');
  const [prepEnd, setPrepEnd] = useState(prepRecord?.endTime || '');

  useEffect(() => {
    setAbastStartDate(abastRecord?.startDate || prepDate || '');
    setAbastStart(abastRecord?.startTime || '');
    setAbastEndDate(abastRecord?.endDate || abastRecord?.startDate || prepDate || '');
    setAbastEnd(abastRecord?.endTime || '');
  }, [abastRecord?.startDate, abastRecord?.startTime, abastRecord?.endDate, abastRecord?.endTime, prepDate]);

  useEffect(() => {
    setPrepStartDate(prepRecord?.startDate || prepDate || '');
    setPrepStart(prepRecord?.startTime || '');
    setPrepEndDate(prepRecord?.endDate || prepRecord?.startDate || prepDate || '');
    setPrepEnd(prepRecord?.endTime || '');
  }, [prepRecord?.startDate, prepRecord?.startTime, prepRecord?.endDate, prepRecord?.endTime, prepDate]);

  const combinedMetrics = calcCombinedAbastecimentoPreparoMetrics(
    orderStages,
    prepDate,
    {
      scaleName: orderScaleName,
      productName: orderProductName,
      allStages: orderStages,
    },
    driverRules,
    varianceThresholds
  );

  const theme = getStatusTheme(combinedMetrics.status);

  // Quick Stamp Helpers
  const stampAbastNow = (type: 'start' | 'end') => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (type === 'start') {
      setAbastStartDate(dateStr);
      setAbastStart(timeStr);
      onUpdateAbastecimento({ startDate: dateStr, startTime: timeStr });
    } else {
      setAbastEndDate(dateStr);
      setAbastEnd(timeStr);
      onUpdateAbastecimento({ endDate: dateStr, endTime: timeStr });
    }
  };

  const stampPrepNow = (type: 'start' | 'end') => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (type === 'start') {
      setPrepStartDate(dateStr);
      setPrepStart(timeStr);
      onUpdatePreparo({ startDate: dateStr, startTime: timeStr });
    } else {
      setPrepEndDate(dateStr);
      setPrepEnd(timeStr);
      onUpdatePreparo({ endDate: dateStr, endTime: timeStr });
    }
  };

  const formatTimeDisplay = (date?: string, time?: string) => {
    if (!time) return '--:--';
    if (!date) return time;
    const parts = date.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]} ${time}`;
    }
    return time;
  };

  // --- DIRECT EDIT OR ACTIVE EDIT MODE ---
  if (directEditMode || isEditing) {
    return (
      <div
        className={`rounded-xl border p-2.5 text-xs transition-all shadow-xl ${
          combinedMetrics.isFilled
            ? `${theme.bg} ${theme.border} ring-1 ring-cyan-500/30`
            : 'bg-slate-900 border-cyan-500/50 ring-1 ring-cyan-500/30'
        } min-w-[240px]`}
      >
        <div className="flex items-center justify-between text-[11px] mb-2 pb-1 border-b border-white/10">
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-slate-100">Abastecimento & Preparo</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
              Unificado
            </span>
          </div>
          {!directEditMode && (
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-white p-1 bg-slate-800 rounded flex items-center gap-1 text-[10px]"
              title="Salvar e fechar"
            >
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>Concluir</span>
            </button>
          )}
        </div>

        {/* Sub-Tabs for selecting which sub-stage to edit */}
        <div className="grid grid-cols-2 gap-1 mb-2 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('abastecimento')}
            className={`py-1 text-[10px] font-mono font-bold rounded transition flex items-center justify-center gap-1 ${
              activeTab === 'abastecimento'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>2. Abast.</span>
            <span className="text-[8.5px] opacity-75">
              ({combinedMetrics.abastMetrics.isFilled ? `${combinedMetrics.abastMetrics.durationMin}m` : '--'})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preparo')}
            className={`py-1 text-[10px] font-mono font-bold rounded transition flex items-center justify-center gap-1 ${
              activeTab === 'preparo'
                ? 'bg-amber-950 text-amber-300 border border-amber-800/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>3. Preparo</span>
            <span className="text-[8.5px] opacity-75">
              ({combinedMetrics.prepMetrics.isFilled ? `${combinedMetrics.prepMetrics.durationMin}m` : '--'})
            </span>
          </button>
        </div>

        {/* Inputs for Abastecimento */}
        {activeTab === 'abastecimento' && (
          <div className="space-y-1.5 mb-2 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
            <div className="text-[9.5px] font-bold text-cyan-300 font-mono flex items-center justify-between">
              <span>Etapa 2: Abastecimento</span>
              <span className="text-slate-400">
                Std: {combinedMetrics.abastMetrics.costMetrics?.standard.hmMin || abastRecord?.standardMin || 0}m
              </span>
            </div>

            {/* Início */}
            <div className="bg-slate-900/90 p-1 rounded border border-slate-800">
              <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5 font-mono">
                <span>Início Abastecimento</span>
                <button
                  type="button"
                  onClick={() => stampAbastNow('start')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  Agora
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1">
                <input
                  type="date"
                  value={abastStartDate}
                  onChange={(e) => {
                    setAbastStartDate(e.target.value);
                    onUpdateAbastecimento({ startDate: e.target.value });
                  }}
                  className="col-span-3 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] font-mono text-white"
                />
                <input
                  type="time"
                  value={abastStart}
                  onChange={(e) => {
                    setAbastStart(e.target.value);
                    const sDate = abastStartDate || prepDate || new Date().toISOString().split('T')[0];
                    setAbastStartDate(sDate);
                    onUpdateAbastecimento({ startTime: e.target.value, startDate: sDate });
                  }}
                  className="col-span-2 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] font-mono text-white text-center"
                />
              </div>
            </div>

            {/* Fim */}
            <div className="bg-slate-900/90 p-1 rounded border border-slate-800">
              <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5 font-mono">
                <span>Fim Abastecimento</span>
                <button
                  type="button"
                  onClick={() => stampAbastNow('end')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  Agora
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1">
                <input
                  type="date"
                  value={abastEndDate}
                  onChange={(e) => {
                    setAbastEndDate(e.target.value);
                    onUpdateAbastecimento({ endDate: e.target.value });
                  }}
                  className="col-span-3 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] font-mono text-white"
                />
                <input
                  type="time"
                  value={abastEnd}
                  onChange={(e) => {
                    setAbastEnd(e.target.value);
                    const eDate = abastEndDate || abastStartDate || prepDate || new Date().toISOString().split('T')[0];
                    setAbastEndDate(eDate);
                    onUpdateAbastecimento({ endTime: e.target.value, endDate: eDate });
                  }}
                  className="col-span-2 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] font-mono text-white text-center"
                />
              </div>
            </div>
          </div>
        )}

        {/* Inputs for Preparo */}
        {activeTab === 'preparo' && (
          <div className="space-y-1.5 mb-2 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
            <div className="text-[9.5px] font-bold text-amber-300 font-mono flex items-center justify-between">
              <span>Etapa 3: Preparo</span>
              <span className="text-slate-400">
                Std: {combinedMetrics.prepMetrics.costMetrics?.standard.hmMin || prepRecord?.standardMin || 0}m
              </span>
            </div>

            {/* Início */}
            <div className="bg-slate-900/90 p-1 rounded border border-slate-800">
              <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5 font-mono">
                <span>Início Preparo</span>
                <button
                  type="button"
                  onClick={() => stampPrepNow('start')}
                  className="text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Agora
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1">
                <input
                  type="date"
                  value={prepStartDate}
                  onChange={(e) => {
                    setPrepStartDate(e.target.value);
                    onUpdatePreparo({ startDate: e.target.value });
                  }}
                  className="col-span-3 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] font-mono text-white"
                />
                <input
                  type="time"
                  value={prepStart}
                  onChange={(e) => {
                    setPrepStart(e.target.value);
                    const sDate = prepStartDate || prepDate || new Date().toISOString().split('T')[0];
                    setPrepStartDate(sDate);
                    onUpdatePreparo({ startTime: e.target.value, startDate: sDate });
                  }}
                  className="col-span-2 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] font-mono text-white text-center"
                />
              </div>
            </div>

            {/* Fim */}
            <div className="bg-slate-900/90 p-1 rounded border border-slate-800">
              <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5 font-mono">
                <span>Fim Preparo</span>
                <button
                  type="button"
                  onClick={() => stampPrepNow('end')}
                  className="text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Agora
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1">
                <input
                  type="date"
                  value={prepEndDate}
                  onChange={(e) => {
                    setPrepEndDate(e.target.value);
                    onUpdatePreparo({ endDate: e.target.value });
                  }}
                  className="col-span-3 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] font-mono text-white"
                />
                <input
                  type="time"
                  value={prepEnd}
                  onChange={(e) => {
                    setPrepEnd(e.target.value);
                    const eDate = prepEndDate || prepStartDate || prepDate || new Date().toISOString().split('T')[0];
                    setPrepEndDate(eDate);
                    onUpdatePreparo({ endTime: e.target.value, endDate: eDate });
                  }}
                  className="col-span-2 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[10px] font-mono text-white text-center"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Summary of Combined Duration & Variances */}
        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5 font-mono">
          <span className="text-slate-300">
            Soma: <strong className="text-white">{combinedMetrics.isFilled ? `${combinedMetrics.durationMin}m` : '--'}</strong>
          </span>
          <div className="flex items-center space-x-1.5 text-[9px] text-slate-400">
            <span className="text-blue-300 font-bold">HH:{combinedMetrics.costMetrics.standard.hhMin}m</span>
            <span className="text-amber-300 font-bold">HM:{combinedMetrics.costMetrics.standard.hmMin}m</span>
            <span className="text-purple-300 font-bold">GGF:{combinedMetrics.costMetrics.standard.ggfMin}m</span>
          </div>
        </div>
      </div>
    );
  }

  // --- CLEAN PRESENTATION MODE (DEFAULT) ---
  const startStr = combinedMetrics.startObj
    ? formatTimeDisplay(combinedMetrics.startObj.date, combinedMetrics.startObj.time)
    : '--:--';
  const endStr = combinedMetrics.endObj
    ? formatTimeDisplay(combinedMetrics.endObj.date, combinedMetrics.endObj.time)
    : '--:--';

  return (
    <div
      onClick={() => setIsEditing(true)}
      title="Clique para apontar ou editar horários de Abastecimento e Preparo"
      className={`group relative rounded-lg border transition-all duration-150 p-2 cursor-pointer min-w-[155px] ${
        combinedMetrics.isFilled
          ? `${theme.bg} ${theme.border} hover:border-slate-500`
          : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
      }`}
    >
      {/* Top Header: Combined Stage Label & Status Pill */}
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="font-semibold text-slate-300 group-hover:text-white transition truncate max-w-[95px]" title="Abastecimento & Preparo (Unificados)">
          Abast. & Prep.
        </span>

        {combinedMetrics.isFilled ? (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono flex items-center gap-0.5 ${theme.badge}`}
          >
            {combinedMetrics.status === 'critical' && <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />}
            {combinedMetrics.status === 'ok' && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
            {combinedMetrics.status === 'warning' && <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
            {combinedMetrics.status === 'ok' ? 'OK' : combinedMetrics.status === 'warning' ? 'Atenção' : 'Desvio'}
          </span>
        ) : (
          <span className="text-[10px] text-slate-500 font-mono">Pendente</span>
        )}
      </div>

      {/* Main Time Range & Status */}
      {combinedMetrics.isFilled ? (
        <div className="space-y-1 my-1">
          {/* Time range */}
          <div className="text-[10.5px] font-mono text-slate-200 flex items-center justify-between gap-1">
            <span className="truncate">{startStr}</span>
            <span className="text-slate-500 text-[9px]">→</span>
            <span className="truncate">{endStr}</span>
          </div>

          {/* Sub-breakdown: Abast & Prep times */}
          <div className="flex items-center justify-between text-[8.5px] font-mono text-slate-400 px-1 py-0.2 rounded bg-slate-950/60 border border-slate-800/60">
            <span>Abast: <strong className="text-cyan-300">{combinedMetrics.abastMetrics.isFilled ? `${combinedMetrics.abastMetrics.durationMin}m` : '0m'}</strong></span>
            <span className="text-slate-600">|</span>
            <span>Prep: <strong className="text-amber-300">{combinedMetrics.prepMetrics.isFilled ? `${combinedMetrics.prepMetrics.durationMin}m` : '0m'}</strong></span>
          </div>

          {/* HH, HM, GGF Consolidated Real vs Std with calculated Variances */}
          <div className="space-y-1 pt-1 border-t border-white/5 text-[9px] font-mono">
            {/* HH */}
            <div className="flex items-center justify-between bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/30">
              <span className="text-blue-300 font-bold">HH:</span>
              <span className="text-slate-300">
                {combinedMetrics.costMetrics.real.hhMin}m <span className="text-slate-500 text-[8px]">/ {combinedMetrics.costMetrics.standard.hhMin}m</span>
              </span>
              <span className={combinedMetrics.costMetrics.variance.hhMin > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-medium'}>
                {combinedMetrics.costMetrics.variance.hhMin > 0 ? `+${combinedMetrics.costMetrics.variance.hhMin}m` : `${combinedMetrics.costMetrics.variance.hhMin}m`}{' '}
                ({formatPercent(combinedMetrics.costMetrics.variance.hhPercent)})
              </span>
            </div>

            {/* HM */}
            <div className="flex items-center justify-between bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/30">
              <span className="text-amber-300 font-bold">HM:</span>
              <span className="text-slate-300">
                {combinedMetrics.costMetrics.real.hmMin}m <span className="text-slate-500 text-[8px]">/ {combinedMetrics.costMetrics.standard.hmMin}m</span>
              </span>
              <span className={combinedMetrics.costMetrics.variance.hmMin > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-medium'}>
                {combinedMetrics.costMetrics.variance.hmMin > 0 ? `+${combinedMetrics.costMetrics.variance.hmMin}m` : `${combinedMetrics.costMetrics.variance.hmMin}m`}{' '}
                ({formatPercent(combinedMetrics.costMetrics.variance.hmPercent)})
              </span>
            </div>

            {/* GGF */}
            <div className="flex items-center justify-between bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-900/30">
              <span className="text-purple-300 font-bold">GGF:</span>
              <span className="text-slate-300">
                {combinedMetrics.costMetrics.real.ggfMin}m <span className="text-slate-500 text-[8px]">/ {combinedMetrics.costMetrics.standard.ggfMin}m</span>
              </span>
              <span className={combinedMetrics.costMetrics.variance.ggfMin > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-medium'}>
                {combinedMetrics.costMetrics.variance.ggfMin > 0 ? `+${combinedMetrics.costMetrics.variance.ggfMin}m` : `${combinedMetrics.costMetrics.variance.ggfMin}m`}{' '}
                ({formatPercent(combinedMetrics.costMetrics.variance.ggfPercent)})
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Pending State: Clean & Minimalist */
        <div className="py-2 text-center text-slate-500 group-hover:text-cyan-400 transition flex flex-col items-center justify-center">
          <div className="flex items-center space-x-1 text-[11px] font-mono">
            <Plus className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            <span>Apontar (2 & 3)</span>
          </div>
          <div className="flex items-center space-x-1 text-[8.5px] text-slate-500 font-mono mt-1">
            <span className="text-blue-400">HH:{combinedMetrics.costMetrics.standard.hhMin}</span>
            <span>•</span>
            <span className="text-amber-400">HM:{combinedMetrics.costMetrics.standard.hmMin}</span>
            <span>•</span>
            <span className="text-purple-400">GGF:{combinedMetrics.costMetrics.standard.ggfMin}</span>
          </div>
        </div>
      )}

      {/* Subtle Edit Hover Indicator */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 p-0.5 rounded text-slate-400 hover:text-white">
        <Edit2 className="w-2.5 h-2.5" />
      </div>
    </div>
  );
};
