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
  Lock,
  Calendar,
} from 'lucide-react';
import { ProcessStageId, StageRecord, CostDriverRule, VarianceThresholdConfig } from '../types';
import { calcStageMetrics, formatMinutes, formatPercent, getStatusTheme } from '../utils/calculations';

interface StageCellProps {
  stageId: ProcessStageId;
  stageName: string;
  record: StageRecord | undefined;
  prepDate?: string;
  orderProductName?: string;
  orderScaleName?: string;
  orderStages?: Record<string, StageRecord>;
  onUpdate: (updated: Partial<StageRecord>) => void;
  directEditMode?: boolean; // When true, always displays inputs directly
  driverRules?: CostDriverRule[];
  varianceThresholds?: VarianceThresholdConfig;
}

export const StageCell: React.FC<StageCellProps> = ({
  stageId,
  stageName,
  record,
  prepDate,
  orderProductName,
  orderScaleName,
  orderStages,
  onUpdate,
  directEditMode = false,
  driverRules,
  varianceThresholds,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(record?.startDate || prepDate || '');
  const [localStart, setLocalStart] = useState(record?.startTime || '');
  const [localEndDate, setLocalEndDate] = useState(record?.endDate || record?.startDate || prepDate || '');
  const [localEnd, setLocalEnd] = useState(record?.endTime || '');

  useEffect(() => {
    setLocalStartDate(record?.startDate || prepDate || '');
    setLocalStart(record?.startTime || '');
    setLocalEndDate(record?.endDate || record?.startDate || prepDate || '');
    setLocalEnd(record?.endTime || '');
  }, [record?.startDate, record?.startTime, record?.endDate, record?.endTime, prepDate]);

  const metrics = calcStageMetrics(
    record,
    prepDate,
    stageId,
    driverRules,
    {
      scaleName: orderScaleName,
      allStages: orderStages,
      productName: orderProductName,
    },
    varianceThresholds
  );
  const theme = getStatusTheme(metrics.status);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalStart(val);
    const sDate = localStartDate || prepDate || new Date().toISOString().split('T')[0];
    setLocalStartDate(sDate);
    onUpdate({ startTime: val, startDate: sDate });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalStartDate(val);
    onUpdate({ startDate: val });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalEnd(val);
    const eDate = localEndDate || localStartDate || prepDate || new Date().toISOString().split('T')[0];
    setLocalEndDate(eDate);
    onUpdate({ endTime: val, endDate: eDate });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalEndDate(val);
    onUpdate({ endDate: val });
  };

  const stampNowStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setLocalStartDate(dateStr);
    setLocalStart(timeStr);
    onUpdate({ startDate: dateStr, startTime: timeStr });
  };

  const stampNowEnd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setLocalEndDate(dateStr);
    setLocalEnd(timeStr);
    onUpdate({ endDate: dateStr, endTime: timeStr });
  };

  // Helper to format concise date/time for presentation
  const formatTimeDisplay = (date?: string, time?: string) => {
    if (!time) return '--:--';
    if (!date) return time;
    const parts = date.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]} ${time}`;
    }
    return time;
  };

  // If in direct edit mode or actively editing this cell
  if (directEditMode || isEditing) {
    return (
      <div
        className={`rounded-lg border p-2 text-xs transition-all shadow-md ${
          metrics.isFilled
            ? `${theme.bg} ${theme.border}`
            : 'bg-slate-900 border-cyan-500/50 ring-1 ring-cyan-500/30'
        } min-w-[210px]`}
      >
        <div className="flex items-center justify-between text-[11px] mb-1.5 pb-1 border-b border-white/10">
          <span className="font-semibold text-slate-200">{stageName}</span>
          {!directEditMode && (
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-white p-0.5 bg-slate-800 rounded"
              title="Salvar e fechar edição"
            >
              <Check className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          )}
        </div>

        <div className="space-y-1.5 mb-2">
          {/* Início Date + Time */}
          <div className="bg-slate-950/80 p-1 rounded border border-slate-800">
            <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5 font-mono">
              <span>Início</span>
              <button
                type="button"
                onClick={stampNowStart}
                className="text-cyan-400 hover:text-cyan-300 font-semibold"
                title="Marcar agora"
              >
                Agora
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1">
              <input
                type="date"
                value={localStartDate}
                onChange={handleStartDateChange}
                className="col-span-3 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded px-1 py-0.5 text-[10px] font-mono text-white"
                title="Data de Início"
              />
              <input
                type="time"
                value={localStart}
                onChange={handleStartChange}
                className="col-span-2 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded px-1 py-0.5 text-[10px] font-mono text-white text-center"
                title="Hora de Início"
              />
            </div>
          </div>

          {/* Fim Date + Time */}
          <div className="bg-slate-950/80 p-1 rounded border border-slate-800">
            <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5 font-mono">
              <span>Fim</span>
              <button
                type="button"
                onClick={stampNowEnd}
                className="text-cyan-400 hover:text-cyan-300 font-semibold"
                title="Marcar agora"
              >
                Agora
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1">
              <input
                type="date"
                value={localEndDate}
                onChange={handleEndDateChange}
                className="col-span-3 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded px-1 py-0.5 text-[10px] font-mono text-white"
                title="Data de Término"
              />
              <input
                type="time"
                value={localEnd}
                onChange={handleEndChange}
                className="col-span-2 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded px-1 py-0.5 text-[10px] font-mono text-white text-center"
                title="Hora de Término"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 font-mono">
          <span className="text-slate-300">
            Duração: <strong className="text-white">{metrics.isFilled ? formatMinutes(metrics.durationMin) : '--'}</strong>
          </span>
          <div className="flex items-center space-x-1.5 text-[9px] text-slate-400">
            <span className="text-blue-300 font-bold">HH:{metrics.costMetrics?.standard.hhMin || record?.setupCostBreakdown?.hhMin || 0}m</span>
            <span className="text-amber-300 font-bold">HM:{metrics.costMetrics?.standard.hmMin || record?.setupCostBreakdown?.hmMin || 0}m</span>
            <span className="text-purple-300 font-bold">GGF:{metrics.costMetrics?.standard.ggfMin || record?.setupCostBreakdown?.ggfMin || 0}m</span>
          </div>
        </div>
      </div>
    );
  }

  // --- CLEAN PRESENTATION MODE (DEFAULT) ---
  const hasDateDiff = (record?.startDate && record?.endDate && record.startDate !== record.endDate) || metrics.isMultiDay;

  return (
    <div
      onClick={() => setIsEditing(true)}
      title="Clique para editar data e horários do apontamento"
      className={`group relative rounded-lg border transition-all duration-150 p-2 cursor-pointer min-w-[145px] ${
        metrics.isFilled
          ? `${theme.bg} ${theme.border} hover:border-slate-500`
          : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
      }`}
    >
      {/* Top Header: Stage Label & Status Pill */}
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="font-semibold text-slate-300 group-hover:text-white transition">
          {stageName}
        </span>

        {metrics.isFilled ? (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono flex items-center gap-0.5 ${theme.badge}`}
          >
            {metrics.status === 'critical' && <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />}
            {metrics.status === 'ok' && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
            {metrics.status === 'warning' && <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
            {metrics.status === 'ok' ? 'OK' : metrics.status === 'warning' ? 'Atenção' : 'Desvio'}
          </span>
        ) : (
          <span className="text-[10px] text-slate-500 font-mono">Pendente</span>
        )}
      </div>

      {/* Main Time Range & Status */}
      {metrics.isFilled ? (
        <div className="space-y-1 my-1">
          {/* Time range */}
          <div className="text-[10.5px] font-mono text-slate-200 flex items-center justify-between gap-1">
            <span className="truncate" title={record?.startDate ? `${record.startDate} ${record?.startTime}` : record?.startTime}>
              {hasDateDiff ? formatTimeDisplay(record?.startDate, record?.startTime) : record?.startTime}
            </span>
            <span className="text-slate-500 text-[9px]">→</span>
            <span className="truncate" title={record?.endDate ? `${record.endDate} ${record?.endTime}` : record?.endTime}>
              {hasDateDiff ? formatTimeDisplay(record?.endDate, record?.endTime) : record?.endTime}
            </span>
            {metrics.isOvernight && !metrics.isMultiDay && (
              <span title="Virada de meia-noite">
                <Moon className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
              </span>
            )}
          </div>

          {/* HH, HM, GGF Independent Real vs Std with calculated Variances */}
          {metrics.costMetrics && (
            <div className="space-y-1 pt-1 border-t border-white/5 text-[9px] font-mono">
              {/* HH */}
              <div className="flex items-center justify-between bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/30">
                <span className="text-blue-300 font-bold">HH:</span>
                <span className="text-slate-300">
                  {metrics.costMetrics.real.hhMin}m <span className="text-slate-500 text-[8px]">/ {metrics.costMetrics.standard.hhMin}m</span>
                </span>
                <span className={metrics.costMetrics.variance.hhMin > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-medium'}>
                  {metrics.costMetrics.variance.hhMin > 0 ? `+${metrics.costMetrics.variance.hhMin}m` : `${metrics.costMetrics.variance.hhMin}m`}{' '}
                  ({formatPercent(metrics.costMetrics.variance.hhPercent)})
                </span>
              </div>

              {/* HM */}
              <div className="flex items-center justify-between bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/30">
                <span className="text-amber-300 font-bold">HM:</span>
                <span className="text-slate-300">
                  {metrics.costMetrics.real.hmMin}m <span className="text-slate-500 text-[8px]">/ {metrics.costMetrics.standard.hmMin}m</span>
                </span>
                <span className={metrics.costMetrics.variance.hmMin > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-medium'}>
                  {metrics.costMetrics.variance.hmMin > 0 ? `+${metrics.costMetrics.variance.hmMin}m` : `${metrics.costMetrics.variance.hmMin}m`}{' '}
                  ({formatPercent(metrics.costMetrics.variance.hmPercent)})
                </span>
              </div>

              {/* GGF */}
              <div className="flex items-center justify-between bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-900/30">
                <span className="text-purple-300 font-bold">GGF:</span>
                <span className="text-slate-300">
                  {metrics.costMetrics.real.ggfMin}m <span className="text-slate-500 text-[8px]">/ {metrics.costMetrics.standard.ggfMin}m</span>
                </span>
                <span className={metrics.costMetrics.variance.ggfMin > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-medium'}>
                  {metrics.costMetrics.variance.ggfMin > 0 ? `+${metrics.costMetrics.variance.ggfMin}m` : `${metrics.costMetrics.variance.ggfMin}m`}{' '}
                  ({formatPercent(metrics.costMetrics.variance.ggfPercent)})
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty / Pending State: Clean & Minimalist */
        <div className="py-2 text-center text-slate-500 group-hover:text-cyan-400 transition flex flex-col items-center justify-center">
          <div className="flex items-center space-x-1 text-[11px] font-mono">
            <Plus className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            <span>Apontar</span>
          </div>
          <div className="flex items-center space-x-1 text-[8.5px] text-slate-500 font-mono mt-1">
            <span className="text-blue-400">HH:{record?.setupCostBreakdown?.hhMin || 0}</span>
            <span>•</span>
            <span className="text-amber-400">HM:{record?.setupCostBreakdown?.hmMin || 0}</span>
            <span>•</span>
            <span className="text-purple-400">GGF:{record?.setupCostBreakdown?.ggfMin || 0}</span>
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
