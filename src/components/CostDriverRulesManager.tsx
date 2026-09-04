import React, { useState, useMemo } from 'react';
import {
  Layers,
  RotateCcw,
  CheckCircle2,
  Users,
  Cpu,
  Building2,
  Calculator,
  Sliders,
  Sparkles,
  HelpCircle,
  Clock,
  Check,
  X,
  Scale,
  FileText,
  Equal,
  Info,
  ChevronRight,
  Package,
  Copy,
  Trash2,
  Filter,
  Lock,
} from 'lucide-react';
import {
  ProcessStageId,
  CostDriverRule,
  DEFAULT_COST_DRIVER_RULES,
  StageDriverRuleConfig,
  PROCESS_STAGES,
  ScaleDriverOverride,
  VarianceThresholdConfig,
  ProductPreset,
} from '../types';
import {
  getStoredCostDriverRules,
  saveStoredCostDriverRules,
  safeEvaluateMath,
  evaluateConfigFormula,
  explainDriverCalculation,
  formatMinutes,
  getStoredProductPresets,
} from '../utils/calculations';
import { DEFAULT_PRODUCTION_SCALES } from '../utils/mockData';
import { VarianceThresholdsManager } from './VarianceThresholdsManager';

interface DriverRowProps {
  stageId: ProcessStageId;
  driverKey: 'hhRule' | 'hmRule' | 'ggfRule';
  driverTitle: string;
  driverSubtitle: string;
  theme: 'blue' | 'amber' | 'purple';
  icon: React.ReactNode;
  config: StageDriverRuleConfig;
  activeScale: string; // scale name like '100L', '500L', '3000L', '5000L'
  activeProductName?: string; // empty/undefined = Global (all products)
  stageStandardMin: number;
  onUpdate: (newConfig: StageDriverRuleConfig) => void;
}

const DriverRow: React.FC<DriverRowProps> = ({
  stageId,
  driverKey,
  driverTitle,
  driverSubtitle,
  theme,
  icon,
  config,
  activeScale,
  activeProductName,
  stageStandardMin,
  onUpdate,
}) => {
  const isProductSpecific = Boolean(activeProductName);

  // Check what level of override is currently in effect
  const scaleOverrides = config.scaleOverrides || {};
  const currentScaleOverride: ScaleDriverOverride = scaleOverrides[activeScale] || {};

  const productScaleOverrides = config.productScaleOverrides || {};
  const currentProductScaleOverride: ScaleDriverOverride | undefined =
    activeProductName && productScaleOverrides[activeProductName]?.[activeScale];

  const productOverrides = config.productOverrides || {};
  const currentProductOverride: ScaleDriverOverride | undefined =
    activeProductName && productOverrides[activeProductName];

  // Specific override for current selection
  const hasCustomProductScaleOverride = Boolean(
    activeProductName &&
      productScaleOverrides[activeProductName] &&
      productScaleOverrides[activeProductName][activeScale] &&
      (productScaleOverrides[activeProductName][activeScale].criterionText !== undefined ||
        productScaleOverrides[activeProductName][activeScale].mathFormula !== undefined ||
        productScaleOverrides[activeProductName][activeScale].includeProcessDuration !== undefined)
  );

  const hasScaleOverride = Boolean(
    scaleOverrides[activeScale] &&
      (scaleOverrides[activeScale].criterionText !== undefined ||
        scaleOverrides[activeScale].mathFormula !== undefined ||
        scaleOverrides[activeScale].includeProcessDuration !== undefined)
  );

  // Evaluate math formula and preview
  const evalResult = evaluateConfigFormula(
    config,
    stageStandardMin,
    {
      scaleName: activeScale,
      productName: activeProductName,
      stageId,
      driverKey,
    }
  );

  const isDayBased = evalResult.isDayBased;
  const baseMath = evalResult.baseMath;
  const simExampleTotal = evalResult.resultMin;

  // Active values in input fields
  const currentCriterion = evalResult.criterionText;
  const currentFormula = evalResult.mathFormula;
  const currentIncludeDuration = evalResult.includeProcessDuration;

  const themeStyles = {
    blue: {
      border: 'border-blue-900/40 hover:border-blue-800/60',
      bg: 'bg-blue-950/20',
      badge: 'text-blue-400 bg-blue-950/80 border-blue-800/40',
      title: 'text-blue-300',
      highlight: 'text-blue-400',
      simBg: 'bg-blue-950/40 border-blue-900/40',
      btnActive: 'bg-blue-600 text-white shadow-blue-500/20',
    },
    amber: {
      border: 'border-amber-900/40 hover:border-amber-800/60',
      bg: 'bg-amber-950/20',
      badge: 'text-amber-400 bg-amber-950/80 border-amber-800/40',
      title: 'text-amber-300',
      highlight: 'text-amber-400',
      simBg: 'bg-amber-950/40 border-amber-900/40',
      btnActive: 'bg-amber-600 text-white shadow-amber-500/20',
    },
    purple: {
      border: 'border-purple-900/40 hover:border-purple-800/60',
      bg: 'bg-purple-950/20',
      badge: 'text-purple-400 bg-purple-950/80 border-purple-800/40',
      title: 'text-purple-300',
      highlight: 'text-purple-400',
      simBg: 'bg-purple-950/40 border-purple-900/40',
      btnActive: 'bg-purple-600 text-white shadow-purple-500/20',
    },
  }[theme];

  const handleCriterionChange = (val: string) => {
    if (isProductSpecific && activeProductName) {
      const prodOverrides = { ...(config.productScaleOverrides || {}) };
      const forProd = { ...(prodOverrides[activeProductName] || {}) };
      forProd[activeScale] = {
        ...(forProd[activeScale] || {}),
        criterionText: val,
        mathFormula: forProd[activeScale]?.mathFormula !== undefined ? forProd[activeScale].mathFormula : currentFormula,
        includeProcessDuration: forProd[activeScale]?.includeProcessDuration !== undefined ? forProd[activeScale].includeProcessDuration : currentIncludeDuration,
      };
      prodOverrides[activeProductName] = forProd;
      onUpdate({
        ...config,
        productScaleOverrides: prodOverrides,
      });
    } else {
      const updatedOverrides = {
        ...scaleOverrides,
        [activeScale]: {
          ...currentScaleOverride,
          criterionText: val,
        },
      };
      onUpdate({
        ...config,
        mode: 'custom_formula',
        scaleOverrides: updatedOverrides,
      });
    }
  };

  const handleFormulaChange = (val: string) => {
    if (isProductSpecific && activeProductName) {
      const prodOverrides = { ...(config.productScaleOverrides || {}) };
      const forProd = { ...(prodOverrides[activeProductName] || {}) };
      forProd[activeScale] = {
        ...(forProd[activeScale] || {}),
        mathFormula: val,
        criterionText: forProd[activeScale]?.criterionText !== undefined ? forProd[activeScale].criterionText : currentCriterion,
        includeProcessDuration: forProd[activeScale]?.includeProcessDuration !== undefined ? forProd[activeScale].includeProcessDuration : currentIncludeDuration,
      };
      prodOverrides[activeProductName] = forProd;
      onUpdate({
        ...config,
        productScaleOverrides: prodOverrides,
      });
    } else {
      const updatedOverrides = {
        ...scaleOverrides,
        [activeScale]: {
          ...currentScaleOverride,
          mathFormula: val,
        },
      };
      onUpdate({
        ...config,
        mode: 'custom_formula',
        scaleOverrides: updatedOverrides,
      });
    }
  };

  const handleIncludeDurationChange = (val: boolean) => {
    if (isProductSpecific && activeProductName) {
      const prodOverrides = { ...(config.productScaleOverrides || {}) };
      const forProd = { ...(prodOverrides[activeProductName] || {}) };
      forProd[activeScale] = {
        ...(forProd[activeScale] || {}),
        includeProcessDuration: val,
        criterionText: forProd[activeScale]?.criterionText !== undefined ? forProd[activeScale].criterionText : currentCriterion,
        mathFormula: forProd[activeScale]?.mathFormula !== undefined ? forProd[activeScale].mathFormula : currentFormula,
      };
      prodOverrides[activeProductName] = forProd;
      onUpdate({
        ...config,
        productScaleOverrides: prodOverrides,
      });
    } else {
      const updatedOverrides = {
        ...scaleOverrides,
        [activeScale]: {
          ...currentScaleOverride,
          includeProcessDuration: val,
        },
      };
      onUpdate({
        ...config,
        mode: 'custom_formula',
        scaleOverrides: updatedOverrides,
      });
    }
  };

  const handleClearProductOverride = () => {
    if (activeProductName && config.productScaleOverrides && config.productScaleOverrides[activeProductName]) {
      const prodOverrides = { ...config.productScaleOverrides };
      const forProd = { ...prodOverrides[activeProductName] };
      delete forProd[activeScale];
      if (Object.keys(forProd).length === 0) {
        delete prodOverrides[activeProductName];
      } else {
        prodOverrides[activeProductName] = forProd;
      }
      onUpdate({
        ...config,
        productScaleOverrides: prodOverrides,
      });
    }
  };

  return (
    <div className={`p-3.5 rounded-xl border ${themeStyles.border} ${themeStyles.bg} transition space-y-3`}>
      {/* Header of Driver */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">{icon}</div>
          <div>
            <span className={`text-xs font-bold font-mono ${themeStyles.title}`}>{driverTitle}</span>
            <span className="text-[10px] text-slate-400 ml-2">({driverSubtitle})</span>
          </div>
          {isDayBased && (
            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded flex items-center gap-1">
              📅 Base em Dias (min ÷ 1440)
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isProductSpecific ? (
            hasCustomProductScaleOverride ? (
              <div className="flex items-center space-x-1.5">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60 rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Específico: {activeProductName} ({activeScale})
                </span>
                <button
                  type="button"
                  onClick={handleClearProductOverride}
                  title="Restaurar herança da regra geral da escala"
                  className="p-1 text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded flex items-center gap-1">
                <span>🔗 Herdando da Escala {activeScale}</span>
              </span>
            )
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 rounded">
              Escala Global: {activeScale}
            </span>
          )}
        </div>
      </div>

      {/* Grid of the 4 columns: Critérios | Tempos Fórmula Matemática | Considerar tempo apontado | Resultado */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        {/* 1. Campo para escrever texto (Critérios) */}
        <div className="md:col-span-4 space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3 h-3 text-cyan-400" />
            Critérios (Texto Corrido):
          </label>
          <textarea
            rows={2}
            value={currentCriterion}
            onChange={(e) => handleCriterionChange(e.target.value)}
            placeholder={
              isProductSpecific
                ? `Critérios específicos para ${activeProductName} (${activeScale})...`
                : 'Escrever critérios e justificativas da regra...'
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 transition resize-none"
          />
        </div>

        {/* 2. Campo para fazer conta (Tempos Fórmula Matemática) */}
        <div className="md:col-span-3 space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Calculator className="w-3 h-3 text-cyan-400" />
            Fórmula Matemática (Conta):
          </label>
          <input
            type="text"
            value={currentFormula}
            onChange={(e) => handleFormulaChange(e.target.value)}
            placeholder={isDayBased ? 'Ex: 30, dias * 30, 20 + 10' : 'Ex: 17 + 40, 10 + 10, 30'}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold placeholder-slate-600 focus:border-cyan-500"
          />
          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between px-1">
            <span>{isDayBased ? 'Taxa / Valor Base:' : 'Subtotal da Conta:'}</span>
            <span className="text-slate-200 font-bold">{baseMath} {isDayBased ? 'min/dia' : 'min'}</span>
          </div>
        </div>

        {/* 3. Campo Sim / Não para considerar o tempo apontado dinâmico */}
        <div className="md:col-span-2.5 space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            {isDayBased ? 'Multiplicar por Dias?' : 'Somar Tempo Apontado?'}
          </label>
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => handleIncludeDurationChange(true)}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-1 border transition ${
                currentIncludeDuration
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-950'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Check className="w-3 h-3" />
              <span>SIM</span>
            </button>

            <button
              type="button"
              onClick={() => handleIncludeDurationChange(false)}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-1 border transition ${
                !currentIncludeDuration
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-950'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <X className="w-3 h-3" />
              <span>NÃO</span>
            </button>
          </div>
          <div className="text-[10px] text-center font-mono leading-tight pt-0.5">
            {currentIncludeDuration ? (
              <span className="text-emerald-400 font-medium">
                {isDayBased
                  ? '× (Tempo Apontado ÷ 1440 dias) ➔ min'
                  : '+ Tempo Apontado Real (Início ao Fim)'}
              </span>
            ) : (
              <span className="text-slate-500">
                Apenas valor fixo da fórmula
              </span>
            )}
          </div>
        </div>

        {/* 4. Campo de Resultado da Fórmula */}
        <div className="md:col-span-2.5 space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Equal className="w-3 h-3 text-cyan-400" />
            Fórmula / Total:
          </label>
          <div className={`p-2 rounded-lg border text-center ${themeStyles.simBg}`}>
            <div className={`text-xs font-mono font-bold ${themeStyles.highlight} truncate`}>
              {evalResult.formulaLabel || `${baseMath} min`}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {currentIncludeDuration ? (
                <span>(Padrão {stageStandardMin}m ➔ {simExampleTotal}m)</span>
              ) : (
                <span>({formatMinutes(baseMath)})</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CostDriverRulesManagerProps {
  driverRules?: CostDriverRule[];
  onUpdateDriverRules?: (rules: CostDriverRule[]) => void;
  varianceThresholds?: VarianceThresholdConfig;
  onUpdateVarianceThresholds?: (thresholds: VarianceThresholdConfig) => void;
  onLockAdmin?: () => void;
}

export const CostDriverRulesManager: React.FC<CostDriverRulesManagerProps> = ({
  driverRules: externalDriverRules,
  onUpdateDriverRules,
  varianceThresholds,
  onUpdateVarianceThresholds,
  onLockAdmin,
}) => {
  const [internalRules, setInternalRules] = useState<CostDriverRule[]>(() =>
    getStoredCostDriverRules()
  );

  const driverRules = externalDriverRules || internalRules;

  const setDriverRules = (updaterOrValue: CostDriverRule[] | ((prev: CostDriverRule[]) => CostDriverRule[])) => {
    const next = typeof updaterOrValue === 'function' ? updaterOrValue(driverRules) : updaterOrValue;
    if (onUpdateDriverRules) {
      onUpdateDriverRules(next);
    } else {
      setInternalRules(next);
      saveStoredCostDriverRules(next);
    }
  };

  // Products from stored presets
  const availableProducts: ProductPreset[] = useMemo(() => {
    return getStoredProductPresets();
  }, []);

  // Mode: select specific product name
  const [selectedProductName, setSelectedProductName] = useState<string>(
    () => availableProducts[0]?.name || 'Soja'
  );
  const [activeScaleTab, setActiveScaleTab] = useState<string>(DEFAULT_PRODUCTION_SCALES[0]?.name || '100L');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // Simulator Test Lab values
  const [simProductName, setSimProductName] = useState<string>('');
  const [simScaleName, setSimScaleName] = useState<string>(DEFAULT_PRODUCTION_SCALES[0]?.name || '100L');
  const [simStageId, setSimStageId] = useState<ProcessStageId>('inoculacao');
  const [simDurationMin, setSimDurationMin] = useState<number>(25);

  const handleUpdateDriverRule = (
    stageId: ProcessStageId,
    driverKey: 'hhRule' | 'hmRule' | 'ggfRule',
    newConfig: StageDriverRuleConfig
  ) => {
    setDriverRules((prev) => {
      const updated = prev.map((r) => {
        if (r.stageId === stageId) {
          return {
            ...r,
            [driverKey]: newConfig,
          };
        }
        return r;
      });
      saveStoredCostDriverRules(updated);
      return updated;
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleResetToDefaults = () => {
    setDriverRules(DEFAULT_COST_DRIVER_RULES);
    saveStoredCostDriverRules(DEFAULT_COST_DRIVER_RULES);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Copy current scale rules to all other scales of the selected product or global
  const handleCopyScaleToAllScales = () => {
    setDriverRules((prev) => {
      const updated = prev.map((rule) => {
        const newRule = { ...rule };
        const driverKeys: ('hhRule' | 'hmRule' | 'ggfRule')[] = ['hhRule', 'hmRule', 'ggfRule'];

        driverKeys.forEach((dKey) => {
          const cfg = newRule[dKey];
          if (!cfg) return;

          if (selectedProductName) {
            // Copy product scale override to other scales of this product
            const prodOverrides = { ...(cfg.productScaleOverrides || {}) };
            const forProd = { ...(prodOverrides[selectedProductName] || {}) };
            const sourceOverride = forProd[activeScaleTab] || cfg.scaleOverrides?.[activeScaleTab] || {};

            DEFAULT_PRODUCTION_SCALES.forEach((s) => {
              if (s.name !== activeScaleTab) {
                forProd[s.name] = { ...sourceOverride };
              }
            });
            prodOverrides[selectedProductName] = forProd;
            newRule[dKey] = {
              ...cfg,
              productScaleOverrides: prodOverrides,
            };
          } else {
            // Copy global scale override to all other scales
            const scOverrides = { ...(cfg.scaleOverrides || {}) };
            const sourceOverride = scOverrides[activeScaleTab] || {};
            DEFAULT_PRODUCTION_SCALES.forEach((s) => {
              if (s.name !== activeScaleTab) {
                scOverrides[s.name] = { ...sourceOverride };
              }
            });
            newRule[dKey] = {
              ...cfg,
              scaleOverrides: scOverrides,
            };
          }
        });

        return newRule;
      });

      saveStoredCostDriverRules(updated);
      return updated;
    });

    setCopyNotification(`Regras da escala ${activeScaleTab} replicadas para todas as outras escalas com sucesso!`);
    setTimeout(() => setCopyNotification(null), 3000);
  };

  // Count how many custom overrides exist for a product
  const countProductCustomOverrides = (productName: string) => {
    let count = 0;
    driverRules.forEach((rule) => {
      ['hhRule', 'hmRule', 'ggfRule'].forEach((k) => {
        const cfg = rule[k as 'hhRule' | 'hmRule' | 'ggfRule'];
        if (cfg?.productScaleOverrides?.[productName]) {
          count += Object.keys(cfg.productScaleOverrides[productName]).length;
        }
      });
    });
    return count;
  };

  // Check if a specific scale of a product has custom overrides
  const isScaleCustomizedForProduct = (productName: string, scaleName: string) => {
    return driverRules.some((rule) => {
      return ['hhRule', 'hmRule', 'ggfRule'].some((k) => {
        const cfg = rule[k as 'hhRule' | 'hmRule' | 'ggfRule'];
        return Boolean(cfg?.productScaleOverrides?.[productName]?.[scaleName]);
      });
    });
  };

  // Simulator evaluations
  const activeSimRule =
    driverRules.find((r) => r.stageId === simStageId) ||
    DEFAULT_COST_DRIVER_RULES.find((r) => r.stageId === simStageId)!;

  const simScaleContext = {
    scaleName: simScaleName,
    productName: simProductName || undefined,
    bioreactorId: `BIO-${simScaleName}`,
    stageId: simStageId,
  };

  const simHhExp = explainDriverCalculation(
    simDurationMin,
    60,
    activeSimRule?.hhRule,
    { ...simScaleContext, driverKey: 'hhRule' },
    'HH'
  );
  const simHmExp = explainDriverCalculation(
    simDurationMin,
    60,
    activeSimRule?.hmRule,
    { ...simScaleContext, driverKey: 'hmRule' },
    'HM'
  );
  const simGgfExp = explainDriverCalculation(
    simDurationMin,
    60,
    activeSimRule?.ggfRule,
    { ...simScaleContext, driverKey: 'ggfRule' },
    'GGF'
  );

  const simDays = simDurationMin / 1440;
  const isSimDayStage = simStageId === 'multiplicacao';

  return (
    <div className="space-y-6">
      {/* 1. Thresholds Configuration Card (Verde / Amarelo / Vermelho) */}
      <VarianceThresholdsManager
        thresholds={varianceThresholds}
        onUpdateThresholds={onUpdateVarianceThresholds}
      />

      {/* 2. Top Header for Driver Rules & Formulas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Critérios de Fórmulas por Produto, Etapa e Escala (HH / HM / GGF)
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                  Fórmula Livre
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Configure as regras gerais ou selecione um <b>Produto específico</b> para definir critérios e fórmulas para cada <b>Escala</b> (100L, 500L, 3000L, 5000L). Suporta <b>Critérios</b> (texto explicativo), <b>Fórmulas Matemáticas</b> (<code className="text-cyan-300">17 + 40</code>, <code className="text-cyan-300">10 + 10</code>) e <b>Tempo Apontado</b> (<span className="text-emerald-400 font-bold">SIM</span> / <span className="text-rose-400 font-bold">NÃO</span>).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleResetToDefaults}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition"
              title="Restaurar valores padrão originais"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Fórmulas Padrão</span>
            </button>

            {onLockAdmin && (
              <button
                type="button"
                onClick={onLockAdmin}
                className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                title="Bloquear este painel e retornar para a visualização operacional"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Bloquear Painel</span>
              </button>
            )}
          </div>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-mono flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Critérios e fórmulas salvos com sucesso! Todas as ordens e relatórios foram recalculados.</span>
          </div>
        )}

        {copyNotification && (
          <div className="bg-cyan-950/60 border border-cyan-700/60 text-cyan-300 px-3.5 py-2 rounded-xl text-xs font-mono flex items-center space-x-2 animate-fadeIn">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{copyNotification}</span>
          </div>
        )}
      </div>

      {/* 3. SELETOR DE ESCOPO: PRODUTO E ESCALA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Product Scope Selection */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                1. Selecione o Produto:
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Selecione o produto cadastrado para configurar critérios e fórmulas por escala.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {/* Registered Products */}
            {availableProducts.map((prod) => {
              const isSelected = selectedProductName === prod.name;
              const overridesCount = countProductCustomOverrides(prod.name);

              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => setSelectedProductName(prod.name)}
                  className={`p-3 rounded-xl border text-left transition flex items-start justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-950/90 to-blue-950/60 border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                        📦 {prod.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 mt-1">
                      {prod.code && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {prod.code}
                        </span>
                      )}
                      {overridesCount > 0 ? (
                        <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          {overridesCount} custom
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-slate-500">
                          Padrão ativo
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scale Selection */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                2. Selecione a Escala do Biorreator:
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopyScaleToAllScales}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg flex items-center space-x-1 transition"
                title="Copiar critérios e fórmulas da escala ativa para todas as outras escalas"
              >
                <Copy className="w-3 h-3 text-cyan-400" />
                <span>Replicar {activeScaleTab} para Outras Escalas</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {DEFAULT_PRODUCTION_SCALES.map((scale) => {
              const isSelected = activeScaleTab === scale.name;
              const hasCustom = selectedProductName
                ? isScaleCustomizedForProduct(selectedProductName, scale.name)
                : false;

              return (
                <button
                  key={scale.id}
                  onClick={() => setActiveScaleTab(scale.name)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center space-x-2 ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30 border border-cyan-400 ring-2 ring-cyan-500/20'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span>📏 Escala {scale.name} ({scale.volumeLiters}L)</span>
                  {hasCustom && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400" title="Possui regras customizadas para este produto" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Context Banner */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Editando regras de:</span>
              <span className="font-bold text-cyan-300 font-mono">
                Produto "{selectedProductName}"
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-bold text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                Escala {activeScaleTab}
              </span>
            </div>

            {selectedProductName && (
              <div className="text-[11px] text-slate-400">
                {isScaleCustomizedForProduct(selectedProductName, activeScaleTab) ? (
                  <span className="text-amber-300 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Regras personalizadas ativas para este produto e escala.
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Herdando automaticamente a regra geral da escala {activeScaleTab}. (Ao editar, uma regra exclusiva será criada).
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulator Test Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Simulador Dinâmico em Tempo Real
                <span className="px-2 py-0.5 text-[9px] font-mono bg-cyan-500/20 text-cyan-300 rounded font-semibold border border-cyan-500/30">
                  Teste das Fórmulas
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Altere o produto, escala, etapa e duração para testar instantaneamente como as fórmulas calculam os minutos.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">
              Produto no Teste:
            </label>
            <select
              value={simProductName}
              onChange={(e) => setSimProductName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-medium"
            >
              <option value="">🌐 Geral (Padrão Global)</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.name}>
                  📦 {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">
              Escala no Teste:
            </label>
            <select
              value={simScaleName}
              onChange={(e) => setSimScaleName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-medium"
            >
              {DEFAULT_PRODUCTION_SCALES.map((s) => (
                <option key={s.id} value={s.name}>
                  Escala {s.name} ({s.volumeLiters}L)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">
              Etapa Selecionada:
            </label>
            <select
              value={simStageId}
              onChange={(e) => {
                const newStage = e.target.value as ProcessStageId;
                setSimStageId(newStage);
                if (newStage === 'multiplicacao') setSimDurationMin(1440);
                else if (newStage === 'inoculacao') setSimDurationMin(25);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-medium"
            >
              {PROCESS_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1 flex items-center justify-between">
              <span>Tempo Apontado (Início ao Fim):</span>
              {isSimDayStage && (
                <span className="text-amber-300 font-mono text-[10px] font-bold">
                  {simDays.toFixed(2)} dias
                </span>
              )}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="100000"
                value={simDurationMin}
                onChange={(e) => setSimDurationMin(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:border-cyan-500"
              />
              <span className="text-xs text-slate-400 font-mono shrink-0">
                min
              </span>
            </div>
          </div>
        </div>

        {isSimDayStage && (
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            <span className="text-[10px] text-slate-500">Atalhos em dias:</span>
            {[
              { label: '1 dia (24h)', min: 1440 },
              { label: '2 dias (48h)', min: 2880 },
              { label: '3 dias (72h)', min: 4320 },
              { label: '4 dias (96h)', min: 5760 },
              { label: '5 dias (120h)', min: 7200 },
            ].map((preset) => (
              <button
                key={preset.min}
                type="button"
                onClick={() => setSimDurationMin(preset.min)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                  simDurationMin === preset.min
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* Results in Simulator */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-slate-950/90 border border-blue-800/50 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-blue-300">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                HH (Hora Homem)
              </span>
              <span className="text-blue-400 text-sm">{simHhExp.resultMin} min</span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">{simHhExp.detailedFormula}</div>
          </div>

          <div className="bg-slate-950/90 border border-amber-800/50 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-300">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                HM (Hora Máquina)
              </span>
              <span className="text-amber-400 text-sm">{simHmExp.resultMin} min</span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">{simHmExp.detailedFormula}</div>
          </div>

          <div className="bg-slate-950/90 border border-purple-800/50 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-300">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                GGF (Gastos Gerais)
              </span>
              <span className="text-purple-400 text-sm">{simGgfExp.resultMin} min</span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">{simGgfExp.detailedFormula}</div>
          </div>
        </div>
      </div>

      {/* Stages List with the Model Structure */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Tabela de Critérios e Fórmulas por Etapa
              </h3>
              <p className="text-xs text-slate-400">
                ⚡ <b className="text-cyan-300">Tempo 100% Dinâmico na Produção:</b> Em cada OP, o sistema calcula a duração real a partir da Data/Hora apontadas e aplica as regras deste produto e escala.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono shrink-0">
            {PROCESS_STAGES.length} etapas cadastradas
          </span>
        </div>

        {PROCESS_STAGES.map((stage) => {
          const rule =
            driverRules.find((r) => r.stageId === stage.id) ||
            DEFAULT_COST_DRIVER_RULES.find((r) => r.stageId === stage.id)!;

          return (
            <div
              key={stage.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 hover:border-slate-700 transition"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                    0{stage.sequence}0
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white tracking-tight">{stage.label}</h3>
                      {stage.id === 'abastecimento' && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                          🔗 Unificado no Grid com Preparo
                        </span>
                      )}
                      {stage.id === 'preparo' && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-semibold">
                          🔗 Unificado no Grid com Abastecimento
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{stage.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    Padrão: {stage.defaultStandardMin} min
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    ID: {stage.id}
                  </span>
                </div>
              </div>

              {/* Rows for HH, HM, GGF */}
              <div className="space-y-3">
                {/* 1. HH */}
                <DriverRow
                  stageId={stage.id}
                  driverKey="hhRule"
                  driverTitle="Hora Homem (HH)"
                  driverSubtitle="Mão de Obra Operacional"
                  theme="blue"
                  icon={<Users className="w-4 h-4 text-blue-400" />}
                  config={rule.hhRule}
                  activeScale={activeScaleTab}
                  activeProductName={selectedProductName || undefined}
                  stageStandardMin={stage.defaultStandardMin}
                  onUpdate={(newCfg) => handleUpdateDriverRule(stage.id, 'hhRule', newCfg)}
                />

                {/* 2. HM */}
                <DriverRow
                  stageId={stage.id}
                  driverKey="hmRule"
                  driverTitle="Hora Máquina (HM)"
                  driverSubtitle="Biorreator / Equipamentos"
                  theme="amber"
                  icon={<Cpu className="w-4 h-4 text-amber-400" />}
                  config={rule.hmRule}
                  activeScale={activeScaleTab}
                  activeProductName={selectedProductName || undefined}
                  stageStandardMin={stage.defaultStandardMin}
                  onUpdate={(newCfg) => handleUpdateDriverRule(stage.id, 'hmRule', newCfg)}
                />

                {/* 3. GGF */}
                <DriverRow
                  stageId={stage.id}
                  driverKey="ggfRule"
                  driverTitle="GGF (Gastos Gerais de Fabricação)"
                  driverSubtitle="Ocupação Fabril / Sala Limpa"
                  theme="purple"
                  icon={<Building2 className="w-4 h-4 text-purple-400" />}
                  config={rule.ggfRule}
                  activeScale={activeScaleTab}
                  activeProductName={selectedProductName || undefined}
                  stageStandardMin={stage.defaultStandardMin}
                  onUpdate={(newCfg) => handleUpdateDriverRule(stage.id, 'ggfRule', newCfg)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
