import React, { useState, useMemo } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  HelpCircle,
  Clock,
  Gauge,
  Percent,
  Check,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { VarianceThresholdConfig, DEFAULT_VARIANCE_THRESHOLDS, StageStatus } from '../types';
import {
  getStoredVarianceThresholds,
  saveStoredVarianceThresholds,
  evaluateVarianceStatus,
  formatPercent,
  formatMinutes,
} from '../utils/calculations';

interface VarianceThresholdsManagerProps {
  thresholds?: VarianceThresholdConfig;
  onUpdateThresholds?: (newThresholds: VarianceThresholdConfig) => void;
}

export const VarianceThresholdsManager: React.FC<VarianceThresholdsManagerProps> = ({
  thresholds: externalThresholds,
  onUpdateThresholds,
}) => {
  const [internalThresholds, setInternalThresholds] = useState<VarianceThresholdConfig>(() =>
    getStoredVarianceThresholds()
  );

  const thresholds = externalThresholds || internalThresholds;

  const setThresholds = (
    updaterOrValue: VarianceThresholdConfig | ((prev: VarianceThresholdConfig) => VarianceThresholdConfig)
  ) => {
    const next = typeof updaterOrValue === 'function' ? updaterOrValue(thresholds) : updaterOrValue;
    if (onUpdateThresholds) {
      onUpdateThresholds(next);
    } else {
      setInternalThresholds(next);
      saveStoredVarianceThresholds(next);
    }
  };

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Test Simulator State
  const [simStandardMin, setSimStandardMin] = useState<number>(60);
  const [simRealMin, setSimRealMin] = useState<number>(72);

  const handleFieldChange = <K extends keyof VarianceThresholdConfig>(
    field: K,
    value: VarianceThresholdConfig[K]
  ) => {
    const updated = {
      ...thresholds,
      [field]: value,
    };
    setThresholds(updated);
    saveStoredVarianceThresholds(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleResetDefaults = () => {
    setThresholds(DEFAULT_VARIANCE_THRESHOLDS);
    saveStoredVarianceThresholds(DEFAULT_VARIANCE_THRESHOLDS);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Simulator evaluations
  const simVarianceMin = simRealMin - simStandardMin;
  const simVariancePercent = simStandardMin > 0 ? ((simStandardMin - simRealMin) / simStandardMin) * 100 : 0;
  const simEvaluatedStatus: StageStatus = useMemo(() => {
    return evaluateVarianceStatus(simVarianceMin, simVariancePercent, thresholds);
  }, [simVarianceMin, simVariancePercent, thresholds]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0 shadow-inner">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Faixas de Variação & Tolerâncias de Sinalização (Verde / Amarelo / Vermelho)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                Regras de Farol
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Configure os valores e porcentagens de variação que definem as cores de sinalização nas ordens e etapas: 
              <span className="text-emerald-400 font-semibold ml-1">🟢 Verde (Conforme)</span>, 
              <span className="text-amber-400 font-semibold ml-1">🟡 Amarelo (Atenção)</span> e 
              <span className="text-rose-400 font-semibold ml-1">🔴 Vermelho (Desvio Crítico)</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition"
            title="Restaurar faixas padrão de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Padrão de Cores</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-mono flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Faixas de sinalização salvas com sucesso! O Grid e Analytics já estão refletindo a nova regra.</span>
        </div>
      )}

      {/* Critério de Avaliação (Mode Selector) */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Critério Principal de Avaliação do Farol:
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Escolha como o sistema deve analisar o desvio para acionar as cores
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Option 1: Percent */}
          <button
            type="button"
            onClick={() => handleFieldChange('evaluationMode', 'percent')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between space-y-1 transition ${
              thresholds.evaluationMode === 'percent'
                ? 'bg-cyan-950/40 border-cyan-500/60 ring-2 ring-cyan-500/20 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono flex items-center gap-1.5 text-cyan-300">
                <Percent className="w-3.5 h-3.5" />
                Porcentagem de Eficiência (%)
              </span>
              {thresholds.evaluationMode === 'percent' && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Compara a taxa de variação <code className="text-slate-300">(Standard - Real) ÷ Standard</code>.
            </p>
          </button>

          {/* Option 2: Minutes */}
          <button
            type="button"
            onClick={() => handleFieldChange('evaluationMode', 'minutes')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between space-y-1 transition ${
              thresholds.evaluationMode === 'minutes'
                ? 'bg-cyan-950/40 border-cyan-500/60 ring-2 ring-cyan-500/20 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono flex items-center gap-1.5 text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                Minutos de Atraso (+min)
              </span>
              {thresholds.evaluationMode === 'minutes' && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Avalia diretamente pelo tempo excedido em minutos além do Standard.
            </p>
          </button>

          {/* Option 3: Hybrid */}
          <button
            type="button"
            onClick={() => handleFieldChange('evaluationMode', 'hybrid')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between space-y-1 transition ${
              thresholds.evaluationMode === 'hybrid'
                ? 'bg-cyan-950/40 border-cyan-500/60 ring-2 ring-cyan-500/20 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono flex items-center gap-1.5 text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                Híbrido (Eficiência ou Tolerância)
              </span>
              {thresholds.evaluationMode === 'hybrid' && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Conforme se estiver dentro da tolerância em minutos OU na faixa de eficiência.
            </p>
          </button>
        </div>
      </div>

      {/* 3 Color Band Threshold Config Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 🟢 Verde / Conforme */}
        <div className="bg-emerald-950/20 border-2 border-emerald-500/40 rounded-2xl p-4.5 space-y-3.5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
              <h3 className="text-sm font-bold text-emerald-300">Faixa Verde (Conforme)</h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
              OK / No Prazo
            </span>
          </div>

          <p className="text-xs text-slate-300">
            A etapa ou ordem é considerada <strong className="text-emerald-400">Verde</strong> quando atingir ou superar este nível de eficiência:
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-mono font-bold text-emerald-300 uppercase mb-1">
                Eficiência Mínima para Verde (%):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={50}
                  max={200}
                  step={1}
                  value={thresholds.greenMinPercent}
                  onChange={(e) => handleFieldChange('greenMinPercent', Number(e.target.value) || 100)}
                  className="w-full bg-slate-950 border border-emerald-700/60 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-mono text-emerald-400 font-bold">
                  % ou mais (≥)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Padrão: <b>100%</b> (ex: tempo real igual ou menor que o standard).
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase mb-1">
                Tolerância Máxima de Atraso Permitida (min):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={120}
                  step={1}
                  value={thresholds.greenMaxDelayMin}
                  onChange={(e) => handleFieldChange('greenMaxDelayMin', Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400">
                  minutos extras (≤)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Até quantos minutos de atraso ainda permanece verde (padrão: 0 min).
              </span>
            </div>
          </div>
        </div>

        {/* 🟡 Amarelo / Atenção */}
        <div className="bg-amber-950/20 border-2 border-amber-500/40 rounded-2xl p-4.5 space-y-3.5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between border-b border-amber-900/40 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 ring-4 ring-amber-500/20" />
              <h3 className="text-sm font-bold text-amber-300">Faixa Amarela (Atenção)</h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-amber-950 text-amber-400 border border-amber-800 rounded">
              Alerta Moderado
            </span>
          </div>

          <p className="text-xs text-slate-300">
            A etapa ou ordem fica em <strong className="text-amber-400">Amarelo</strong> quando a eficiência estiver entre este piso e o verde:
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-mono font-bold text-amber-300 uppercase mb-1">
                Piso de Eficiência para Atenção (%):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={30}
                  max={thresholds.greenMinPercent - 1}
                  step={1}
                  value={thresholds.yellowMinPercent}
                  onChange={(e) => handleFieldChange('yellowMinPercent', Number(e.target.value) || 85)}
                  className="w-full bg-slate-950 border border-amber-700/60 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-mono text-amber-400 font-bold">
                  de {thresholds.yellowMinPercent}% a {(thresholds.greenMinPercent - 0.1).toFixed(1)}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Padrão: <b>85%</b> (tolerância intermediária de desvio).
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase mb-1">
                Limite Máximo de Atraso em Minutos (min):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={360}
                  step={1}
                  value={thresholds.yellowMaxDelayMin}
                  onChange={(e) => handleFieldChange('yellowMaxDelayMin', Math.max(1, Number(e.target.value) || 30))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400">
                  até este atraso (≤)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Atrasos de {thresholds.greenMaxDelayMin + 1}m até {thresholds.yellowMaxDelayMin}m acionam Amarelo.
              </span>
            </div>
          </div>
        </div>

        {/* 🔴 Vermelho / Desvio Crítico */}
        <div className="bg-rose-950/20 border-2 border-rose-500/40 rounded-2xl p-4.5 space-y-3.5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between border-b border-rose-900/40 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-400 ring-4 ring-rose-500/20" />
              <h3 className="text-sm font-bold text-rose-300">Faixa Vermelha (Crítico)</h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-rose-950 text-rose-400 border border-rose-800 rounded">
              Desvio / Gargalo
            </span>
          </div>

          <p className="text-xs text-slate-300">
            A etapa ou ordem entra em <strong className="text-rose-400">Vermelho</strong> se ultrapassar o limite de tolerância:
          </p>

          <div className="space-y-3 pt-1">
            <div className="bg-slate-950 p-3 rounded-xl border border-rose-900/40 space-y-1.5">
              <span className="text-[11px] font-mono font-bold text-rose-300 uppercase block">
                Condição de Desvio Percentual:
              </span>
              <div className="text-xs text-white font-mono flex items-center gap-1.5">
                <span className="text-rose-400 font-bold text-sm">&lt; {thresholds.yellowMinPercent}%</span>
                <span className="text-slate-400">de eficiência</span>
              </div>
              <span className="text-[10px] text-slate-400 block">
                Qualquer execução com eficiência abaixo de {thresholds.yellowMinPercent}% é marcada como gargalo crítico.
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-rose-900/40 space-y-1.5">
              <span className="text-[11px] font-mono font-bold text-rose-300 uppercase block">
                Condição de Atraso Absoluto:
              </span>
              <div className="text-xs text-white font-mono flex items-center gap-1.5">
                <span className="text-rose-400 font-bold text-sm">&gt; {thresholds.yellowMaxDelayMin} min</span>
                <span className="text-slate-400">de atraso excedente</span>
              </div>
              <span className="text-[10px] text-slate-400 block">
                Ultrapassando {thresholds.yellowMaxDelayMin} min de atraso, o farol vermelho é imediatamente sinalizado.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Spectrum Bar */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono font-bold">
          <span className="text-slate-400">ESCALA VISUAL DE SINALIZAÇÃO DAS CORES:</span>
          <span className="text-slate-300">Faixas ativas em tempo real</span>
        </div>

        {/* Visual Bar */}
        <div className="h-7 w-full rounded-lg overflow-hidden flex border border-slate-700 shadow-inner font-mono text-[11px] font-bold">
          {/* Red part */}
          <div
            className="bg-gradient-to-r from-rose-700 to-rose-600 text-rose-100 flex items-center justify-center transition-all duration-300"
            style={{ width: `${Math.max(15, Math.min(60, thresholds.yellowMinPercent / 1.5))}%` }}
            title={`Vermelho: Eficiência < ${thresholds.yellowMinPercent}%`}
          >
            🔴 &lt; {thresholds.yellowMinPercent}% (Crítico)
          </div>

          {/* Yellow part */}
          <div
            className="bg-gradient-to-r from-amber-600 to-amber-500 text-amber-950 flex items-center justify-center transition-all duration-300"
            style={{
              width: `${Math.max(
                20,
                Math.min(50, ((thresholds.greenMinPercent - thresholds.yellowMinPercent) / 1.5))
              )}%`,
            }}
            title={`Amarelo: ${thresholds.yellowMinPercent}% a ${thresholds.greenMinPercent}%`}
          >
            🟡 {thresholds.yellowMinPercent}% a {thresholds.greenMinPercent}% (Atenção)
          </div>

          {/* Green part */}
          <div
            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-emerald-950 flex items-center justify-center transition-all duration-300"
            title={`Verde: Eficiência ≥ ${thresholds.greenMinPercent}%`}
          >
            🟢 ≥ {thresholds.greenMinPercent}% (Conforme)
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
          <span>0% Eficiência (Gargalo total)</span>
          <span>Corte Amarelo: {thresholds.yellowMinPercent}%</span>
          <span>Corte Verde: {thresholds.greenMinPercent}%</span>
          <span>100%+ (Dentro ou abaixo do tempo standard)</span>
        </div>
      </div>

      {/* Interactive Simulator & Live Sandbox */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-500/30 rounded-2xl p-4.5 space-y-3.5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              🧪 Simulador em Tempo Real: Teste a Sinalização das Cores
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Altere os tempos para ver como o farol reage às regras que você acabou de configurar
          </span>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Tempo Standard (min):
            </label>
            <input
              type="number"
              min={1}
              value={simStandardMin}
              onChange={(e) => setSimStandardMin(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Tempo Real Apontado (min):
            </label>
            <input
              type="number"
              min={1}
              value={simRealMin}
              onChange={(e) => setSimRealMin(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Preset Buttons */}
          <div className="sm:col-span-2 flex flex-wrap items-center gap-1.5 pb-0.5">
            <button
              type="button"
              onClick={() => {
                setSimStandardMin(60);
                setSimRealMin(50);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono border border-slate-700"
            >
              🚀 Antecipado (50m)
            </button>
            <button
              type="button"
              onClick={() => {
                setSimStandardMin(60);
                setSimRealMin(60);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono border border-slate-700"
            >
              ✅ Exato (60m)
            </button>
            <button
              type="button"
              onClick={() => {
                setSimStandardMin(60);
                setSimRealMin(68);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono border border-slate-700"
            >
              ⚠️ +8m Atraso (68m)
            </button>
            <button
              type="button"
              onClick={() => {
                setSimStandardMin(60);
                setSimRealMin(75);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono border border-slate-700"
            >
              ⚠️ +15m Atraso (75m)
            </button>
            <button
              type="button"
              onClick={() => {
                setSimStandardMin(60);
                setSimRealMin(105);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono border border-slate-700"
            >
              🔴 Gargalo (+45m)
            </button>
          </div>
        </div>

        {/* Live Evaluation Box */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-slate-400 text-[10px] block">DESVIO CALCULADO:</span>
              <span className={`font-bold ${simVarianceMin > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {simVarianceMin > 0 ? `+${simVarianceMin} min` : `${simVarianceMin} min`} ({formatMinutes(simVarianceMin)})
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block">TAXA DE EFICIÊNCIA:</span>
              <span className={`font-bold ${
                simEvaluatedStatus === 'ok'
                  ? 'text-emerald-400'
                  : simEvaluatedStatus === 'warning'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}>
                {formatPercent(simVariancePercent)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block">CRITÉRIO ATIVO:</span>
              <span className="text-slate-200">
                {thresholds.evaluationMode === 'percent'
                  ? 'Porcentagem (%)'
                  : thresholds.evaluationMode === 'minutes'
                  ? 'Minutos (+min)'
                  : 'Híbrido'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px]">COR SINALIZADA:</span>
            {simEvaluatedStatus === 'ok' && (
              <span className="px-3 py-1 bg-emerald-950 border border-emerald-600 text-emerald-300 rounded-lg font-bold flex items-center gap-1.5 text-xs shadow-md">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                🟢 VERDE (Conforme / No Prazo)
              </span>
            )}
            {simEvaluatedStatus === 'warning' && (
              <span className="px-3 py-1 bg-amber-950 border border-amber-600 text-amber-300 rounded-lg font-bold flex items-center gap-1.5 text-xs shadow-md">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                🟡 AMARELO (Atenção / Tolerância)
              </span>
            )}
            {simEvaluatedStatus === 'critical' && (
              <span className="px-3 py-1 bg-rose-950 border border-rose-600 text-rose-300 rounded-lg font-bold flex items-center gap-1.5 text-xs shadow-md">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                🔴 VERMELHO (Desvio Crítico / Gargalo)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
