import {
  ProcessStageId,
  PROCESS_STAGES,
  ProductionOrder,
  StageCalculatedMetrics,
  StageRecord,
  StageStatus,
  OrderTotalMetrics,
  ProductPreset,
  BioreactorItem,
  ScaleStandardConfig,
  StageDefinition,
  StageCostBreakdown,
  CostDriverRule,
  DEFAULT_COST_DRIVER_RULES,
  StageDriverRuleConfig,
  VarianceThresholdConfig,
  DEFAULT_VARIANCE_THRESHOLDS,
} from '../types';
import { PRODUCT_PRESETS } from './mockData';

const COST_DRIVER_RULES_STORAGE_KEY = 'bioprocess_cost_driver_rules_v1';
const STAGE_DESCRIPTIONS_STORAGE_KEY = 'bioprocess_stage_custom_descriptions_v1';
const FORMULA_TERM_OPTIONS_STORAGE_KEY = 'bioprocess_formula_term_options_v1';
export const VARIANCE_THRESHOLDS_STORAGE_KEY = 'bioprocess_variance_thresholds_v2';

/**
 * Loads user configured variance signal thresholds from localStorage or falls back to defaults
 */
export function getStoredVarianceThresholds(): VarianceThresholdConfig {
  try {
    const saved = localStorage.getItem(VARIANCE_THRESHOLDS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.greenMinPercent === 'number' && typeof parsed.yellowMinPercent === 'number') {
        return {
          ...DEFAULT_VARIANCE_THRESHOLDS,
          ...parsed,
        };
      }
    }
  } catch (e) {
    console.error('Failed to load variance thresholds from localStorage', e);
  }
  return DEFAULT_VARIANCE_THRESHOLDS;
}

/**
 * Saves variance thresholds to localStorage
 */
export function saveStoredVarianceThresholds(config: VarianceThresholdConfig): void {
  try {
    localStorage.setItem(VARIANCE_THRESHOLDS_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save variance thresholds to localStorage', e);
  }
}

/**
 * Evaluates the status ('ok' | 'warning' | 'critical') based on variance in minutes and percentage
 * using the configured thresholds (Verde: OK, Amarelo: Atenção, Vermelho: Crítico).
 */
export function evaluateVarianceStatus(
  varianceMin: number, // Real - Standard
  variancePercent: number, // (Standard / Real) * 100
  thresholds?: VarianceThresholdConfig
): StageStatus {
  const config = thresholds || getStoredVarianceThresholds();

  if (config.evaluationMode === 'minutes') {
    // Avaliação direta por minutos de atraso (Real - Standard)
    if (varianceMin <= config.greenMaxDelayMin) {
      return 'ok';
    }
    if (varianceMin <= config.yellowMaxDelayMin) {
      return 'warning';
    }
    return 'critical';
  } else if (config.evaluationMode === 'hybrid') {
    // Modo Híbrido: Se dentro da tolerância de minutos OU atingiu a eficiência verde
    if (varianceMin <= config.greenMaxDelayMin || variancePercent >= config.greenMinPercent) {
      return 'ok';
    }
    if (varianceMin <= config.yellowMaxDelayMin || variancePercent >= config.yellowMinPercent) {
      return 'warning';
    }
    return 'critical';
  } else {
    // Modo Padrão (% de Eficiência com respeito à tolerância de minutos)
    const toleranceMin = config.greenMaxDelayMin || 0;
    if (varianceMin <= toleranceMin || variancePercent >= config.greenMinPercent) {
      return 'ok';
    }
    if (variancePercent >= config.yellowMinPercent) {
      return 'warning';
    }
    return 'critical';
  }
}


export const DEFAULT_FORMULA_TERM_OPTIONS = [
  'Tempo do Processo Apontado',
  'Vaporização de Linha',
  'Montagem do Sistema',
  'Tempo de Abastecimento',
  'Amostragem e Checklists',
  'Tempo de Preparo',
  'Valor Fixo',
];

/**
 * Loads custom formula term options saved by the user
 */
export function getStoredFormulaTermOptions(): string[] {
  try {
    const saved = localStorage.getItem(FORMULA_TERM_OPTIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load formula term options from localStorage', e);
  }
  return DEFAULT_FORMULA_TERM_OPTIONS;
}

/**
 * Saves custom formula term options to localStorage
 */
export function saveStoredFormulaTermOptions(options: string[]): void {
  try {
    localStorage.setItem(FORMULA_TERM_OPTIONS_STORAGE_KEY, JSON.stringify(options));
  } catch (e) {
    console.error('Failed to save formula term options to localStorage', e);
  }
}

/**
 * Loads custom stage descriptions saved by the user. Starts empty by default.
 */
export function getStoredStageDescriptions(): string[] {
  try {
    const saved = localStorage.getItem(STAGE_DESCRIPTIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load stage descriptions from localStorage', e);
  }
  return []; // Começa vazia conforme solicitado pelo usuário
}

/**
 * Saves custom stage descriptions list to localStorage
 */
export function saveStoredStageDescriptions(descriptions: string[]): void {
  try {
    localStorage.setItem(STAGE_DESCRIPTIONS_STORAGE_KEY, JSON.stringify(descriptions));
  } catch (e) {
    console.error('Failed to save stage descriptions to localStorage', e);
  }
}

/**
 * Normalizes loaded cost driver rules ensuring full compatibility with math formulas and overrides
 */
export function normalizeCostDriverRules(loaded: CostDriverRule[]): CostDriverRule[] {
  if (!Array.isArray(loaded) || loaded.length === 0) {
    return DEFAULT_COST_DRIVER_RULES;
  }

  return DEFAULT_COST_DRIVER_RULES.map((defaultRule) => {
    const matched = loaded.find((r) => r.stageId === defaultRule.stageId);
    if (!matched) return defaultRule;

    const normalizeRule = (userRule?: StageDriverRuleConfig, defRule?: StageDriverRuleConfig): StageDriverRuleConfig => {
      if (!userRule) return defRule || { mode: 'custom_formula', mathFormula: '0', includeProcessDuration: true, timeUnit: 'minutes' };
      return {
        ...defRule,
        ...userRule,
        mode: 'custom_formula',
        criterionText: userRule.criterionText !== undefined ? userRule.criterionText : (defRule?.criterionText ?? ''),
        mathFormula: userRule.mathFormula !== undefined ? userRule.mathFormula : (defRule?.mathFormula ?? '0'),
        includeProcessDuration: userRule.includeProcessDuration !== undefined ? userRule.includeProcessDuration : (defRule?.includeProcessDuration ?? true),
        timeUnit: userRule.timeUnit !== undefined ? userRule.timeUnit : defRule?.timeUnit,
        dayOperation: userRule.dayOperation !== undefined ? userRule.dayOperation : defRule?.dayOperation,
        scaleOverrides: userRule.scaleOverrides || defRule?.scaleOverrides || {},
        productScaleOverrides: userRule.productScaleOverrides || defRule?.productScaleOverrides || {},
        productOverrides: userRule.productOverrides || defRule?.productOverrides || {},
      };
    };

    return {
      ...defaultRule,
      ...matched,
      hhRule: normalizeRule(matched.hhRule, defaultRule.hhRule),
      hmRule: normalizeRule(matched.hmRule, defaultRule.hmRule),
      ggfRule: normalizeRule(matched.ggfRule, defaultRule.ggfRule),
    };
  });
}

/**
 * Loads user configured cost driver rules from localStorage or falls back to defaults
 */
export function getStoredCostDriverRules(): CostDriverRule[] {
  try {
    const saved = localStorage.getItem(COST_DRIVER_RULES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeCostDriverRules(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to load cost driver rules from localStorage', e);
  }
  return DEFAULT_COST_DRIVER_RULES;
}

/**
 * Saves cost driver rules to localStorage
 */
export function saveStoredCostDriverRules(rules: CostDriverRule[]): void {
  try {
    const normalized = normalizeCostDriverRules(rules);
    localStorage.setItem(COST_DRIVER_RULES_STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error('Failed to save cost driver rules to localStorage', e);
  }
}

/**
 * Evaluates a single mathematical formula term
 */
export function evaluateFormulaTerm(
  term: import('../types').FormulaTerm,
  durationMin: number,
  stdDriverMin: number,
  context?: {
    scaleName?: string;
    bioreactorId?: string;
    allStages?: Record<string, StageRecord>;
    defaultDate?: string;
  }
): { value: number; label: string; formatted: string } {
  switch (term.type) {
    case 'process_duration':
      return {
        value: durationMin,
        label: term.label || 'Tempo de Processo',
        formatted: `${term.label || 'Tempo de Processo'} (${durationMin}m)`,
      };

    case 'fixed_number': {
      const val = typeof term.numericValue === 'number' ? term.numericValue : 0;
      return {
        value: val,
        label: term.label || `${val}m`,
        formatted: `${term.label ? `${term.label} (${val}m)` : `${val}m`}`,
      };
    }

    case 'scale_offset': {
      let val = term.numericValue ?? 0;
      let scaleTag = '';
      if (context?.scaleName && term.scaleOffsets && term.scaleOffsets[context.scaleName] !== undefined) {
        val = term.scaleOffsets[context.scaleName];
        scaleTag = ` [${context.scaleName}]`;
      }
      const label = term.label || 'Montagem por Escala';
      return {
        value: val,
        label: `${label}${scaleTag}`,
        formatted: `${label}${scaleTag} (${val}m)`,
      };
    }

    case 'linked_stage': {
      let linkedDur = 0;
      const targetStage = term.linkedStageId ? context?.allStages?.[term.linkedStageId] : undefined;
      if (targetStage && targetStage.startTime && targetStage.endTime) {
        const { diff } = calculateMinutesDiff(
          targetStage.startTime,
          targetStage.endTime,
          targetStage.startDate || context?.defaultDate,
          targetStage.endDate || targetStage.startDate || context?.defaultDate
        );
        linkedDur = diff;
      }
      const stageName = PROCESS_STAGES.find((s) => s.id === term.linkedStageId)?.shortLabel || term.linkedStageId || 'Outra Etapa';
      return {
        value: linkedDur,
        label: term.label || `Tempo de ${stageName}`,
        formatted: `${term.label || `Tempo de ${stageName}`} (${linkedDur}m)`,
      };
    }

    case 'percentage_factor': {
      const pct = typeof term.numericValue === 'number' ? term.numericValue : 100;
      return {
        value: pct,
        label: term.label || `${pct}%`,
        formatted: `${pct}%`,
      };
    }

    case 'operators_multiplier': {
      const ops = typeof term.numericValue === 'number' ? term.numericValue : 1;
      return {
        value: ops,
        label: term.label || `${ops} Operadores`,
        formatted: `${ops} ops`,
      };
    }

    case 'sampling_routine': {
      const intervalHours = term.sampleIntervalHours && term.sampleIntervalHours > 0 ? term.sampleIntervalHours : 4;
      const sampleMin = term.sampleDurationMin !== undefined ? term.sampleDurationMin : 15;
      const initChecklist = term.initialChecklistMin ?? 20;
      const shiftChecklist = term.shiftChecklistMin ?? 10;
      const durationHours = durationMin / 60;
      const samplesCount = Math.max(1, Math.round(durationHours / intervalHours));
      const shiftsCount = Math.floor(durationHours / 8);
      const total = initChecklist + (samplesCount * sampleMin) + (shiftsCount * shiftChecklist);
      return {
        value: total,
        label: term.label || `Amostragens (${intervalHours}h) + Checklists`,
        formatted: `Checklist (${initChecklist}m) + ${samplesCount} amostr. × ${sampleMin}m + ${shiftsCount} turnos × ${shiftChecklist}m (${total}m)`,
      };
    }

    case 'standard_duration': {
      return {
        value: stdDriverMin,
        label: term.label || 'Tempo Standard',
        formatted: `Standard (${stdDriverMin}m)`,
      };
    }

    default:
      return {
        value: durationMin,
        label: 'Duração',
        formatted: `${durationMin}m`,
      };
  }
}

/**
 * Evaluates dynamic mathematical formula items (+, *, -, /)
 */
export function evaluateFormulaItems(
  items: import('../types').FormulaItem[],
  durationMin: number,
  stdDriverMin: number,
  context?: {
    scaleName?: string;
    bioreactorId?: string;
    allStages?: Record<string, StageRecord>;
    defaultDate?: string;
  }
): { resultMin: number; formulaLabel: string; detailedFormula: string } {
  if (!items || items.length === 0) {
    return {
      resultMin: durationMin,
      formulaLabel: 'Tempo de Processo (100%)',
      detailedFormula: `${durationMin}m`,
    };
  }

  let runningTotal = 0;
  const labelParts: string[] = [];
  const detailedParts: string[] = [];

  items.forEach((item, index) => {
    const evaluated = evaluateFormulaTerm(item.term, durationMin, stdDriverMin, context);
    const op = item.operator || (index === 0 ? undefined : '+');

    if (index === 0) {
      runningTotal = evaluated.value;
      labelParts.push(evaluated.label);
      detailedParts.push(evaluated.formatted);
    } else {
      const opSymbol = op === '*' ? '×' : op === '/' ? '÷' : op || '+';
      labelParts.push(`${opSymbol} ${evaluated.label}`);
      detailedParts.push(`${opSymbol} ${evaluated.formatted}`);

      if (op === '+') {
        runningTotal += evaluated.value;
      } else if (op === '-') {
        runningTotal -= evaluated.value;
      } else if (op === '*') {
        if (item.term.type === 'percentage_factor') {
          runningTotal = runningTotal * (evaluated.value / 100);
        } else {
          runningTotal = runningTotal * evaluated.value;
        }
      } else if (op === '/') {
        if (evaluated.value !== 0) {
          runningTotal = runningTotal / evaluated.value;
        }
      }
    }
  });

  const finalResult = Math.max(0, Math.round(runningTotal));
  return {
    resultMin: finalResult,
    formulaLabel: labelParts.join(' '),
    detailedFormula: `${detailedParts.join(' ')} = ${finalResult}m`,
  };
}

/**
 * Evaluates a mathematical arithmetic string expression safely (e.g. "17 + 40", "10 + 10", "30", "dias * 30", "(20 * 2) + 15")
 * Supports optional variable substitution (e.g. { dias: 1.5, dia: 1.5, min: 2160 })
 */
export function safeEvaluateMath(expression?: string, variables?: Record<string, number>): number {
  if (!expression || !expression.trim()) return 0;
  let sanitized = expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '.')
    .replace(/\s*x\s*/gi, '*')
    .trim();

  // Substitute variables if provided
  if (variables) {
    Object.entries(variables).forEach(([key, val]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      sanitized = sanitized.replace(regex, `(${val})`);
    });
  }

  // Validate allowed characters: digits, operators, parens, spaces, decimal points
  if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
    const parsed = parseFloat(sanitized);
    return isNaN(parsed) ? 0 : parsed;
  }

  try {
    const fn = new Function(`"use strict"; return (${sanitized});`);
    const val = fn();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return val;
    }
    return 0;
  } catch (e) {
    const fallback = parseFloat(sanitized);
    return isNaN(fallback) ? 0 : fallback;
  }
}

export interface DriverRuleEvaluationContext {
  scaleName?: string;
  bioreactorId?: string;
  productName?: string;
  stageId?: ProcessStageId;
  driverKey?: 'hhRule' | 'hmRule' | 'ggfRule';
  allStages?: Record<string, StageRecord>;
  defaultDate?: string;
}

/**
 * Evaluates formula considering math expression, day-based conversions, and whether to include process duration
 */
export function evaluateConfigFormula(
  config?: StageDriverRuleConfig,
  durationMin: number = 0,
  context?: DriverRuleEvaluationContext
): {
  resultMin: number;
  baseMath: number;
  formulaLabel: string;
  detailedFormula: string;
  criterionText: string;
  mathFormula: string;
  includeProcessDuration: boolean;
  isDayBased: boolean;
  durationDays: number;
} {
  if (!config) {
    return {
      resultMin: durationMin,
      baseMath: 0,
      formulaLabel: 'Tempo Apontado (100%)',
      detailedFormula: `Tempo Apontado (${durationMin}m)`,
      criterionText: '',
      mathFormula: '',
      includeProcessDuration: true,
      isDayBased: false,
      durationDays: durationMin / 1440,
    };
  }

  // Base configuration
  let mathFormula = config.mathFormula ?? '';
  let includeProcessDuration = config.includeProcessDuration ?? true;
  let criterionText = config.criterionText ?? config.offsetLabel ?? config.customFormulaDescription ?? '';
  let timeUnit = config.timeUnit;
  let dayOperation = config.dayOperation;

  // 1. Check global scale override
  if (context?.scaleName && config.scaleOverrides && config.scaleOverrides[context.scaleName]) {
    const scOverride = config.scaleOverrides[context.scaleName];
    if (scOverride.mathFormula !== undefined) mathFormula = scOverride.mathFormula;
    if (scOverride.includeProcessDuration !== undefined) includeProcessDuration = scOverride.includeProcessDuration;
    if (scOverride.criterionText !== undefined) criterionText = scOverride.criterionText;
    if (scOverride.timeUnit !== undefined) timeUnit = scOverride.timeUnit;
    if (scOverride.dayOperation !== undefined) dayOperation = scOverride.dayOperation;
  }

  // 2. Check general product override
  if (context?.productName && config.productOverrides && config.productOverrides[context.productName]) {
    const prodOverride = config.productOverrides[context.productName];
    if (prodOverride.mathFormula !== undefined) mathFormula = prodOverride.mathFormula;
    if (prodOverride.includeProcessDuration !== undefined) includeProcessDuration = prodOverride.includeProcessDuration;
    if (prodOverride.criterionText !== undefined) criterionText = prodOverride.criterionText;
    if (prodOverride.timeUnit !== undefined) timeUnit = prodOverride.timeUnit;
    if (prodOverride.dayOperation !== undefined) dayOperation = prodOverride.dayOperation;
  }

  // 3. Check specific Product + Scale override (Highest specificity)
  if (
    context?.productName &&
    context?.scaleName &&
    config.productScaleOverrides &&
    config.productScaleOverrides[context.productName] &&
    config.productScaleOverrides[context.productName][context.scaleName]
  ) {
    const prodScaleOverride = config.productScaleOverrides[context.productName][context.scaleName];
    if (prodScaleOverride.mathFormula !== undefined) mathFormula = prodScaleOverride.mathFormula;
    if (prodScaleOverride.includeProcessDuration !== undefined) includeProcessDuration = prodScaleOverride.includeProcessDuration;
    if (prodScaleOverride.criterionText !== undefined) criterionText = prodScaleOverride.criterionText;
    if (prodScaleOverride.timeUnit !== undefined) timeUnit = prodScaleOverride.timeUnit;
    if (prodScaleOverride.dayOperation !== undefined) dayOperation = prodScaleOverride.dayOperation;
  }

  const durationDays = durationMin / 1440;
  const durationDaysFormatted = Number.isInteger(durationDays)
    ? `${durationDays.toFixed(0)}d`
    : `${durationDays.toFixed(2)}d`;

  // Detect whether day-based calculation applies (specifically for multiplicacao HH & GGF, or when dias is used)
  const hasDaysVariable = /\b(dias?|days?|d)\b/i.test(mathFormula);
  const isDayBased =
    timeUnit === 'days' ||
    hasDaysVariable ||
    (timeUnit !== 'minutes' &&
      context?.stageId === 'multiplicacao' &&
      (context?.driverKey === 'hhRule' || context?.driverKey === 'ggfRule' || !context?.driverKey));

  let resultMin = 0;
  let detailedFormula = '';
  let formulaLabel = '';
  let baseMath = 0;

  const hasFormulaText = mathFormula.trim() !== '' && mathFormula.trim() !== '0';

  if (isDayBased) {
    if (hasDaysVariable) {
      // User wrote formula explicitly with 'dias' variable, e.g. "dias * 30", "(dias * 2) * 60 + 10"
      baseMath = safeEvaluateMath(mathFormula, { dias: 1, dia: 1, d: 1 });
      const evaluatedVal = safeEvaluateMath(mathFormula, {
        dias: durationDays,
        dia: durationDays,
        d: durationDays,
      });
      resultMin = Math.max(0, Math.round(evaluatedVal));
      formulaLabel = mathFormula;
      detailedFormula = `${mathFormula} [dias = ${durationMin}m ÷ 1440 = ${durationDaysFormatted}] = ${resultMin} min`;
    } else {
      // User wrote a numeric/math expression (e.g. "30", "15 * 2", "20 + 10")
      baseMath = safeEvaluateMath(mathFormula);
      if (includeProcessDuration) {
        if (dayOperation === 'add') {
          // Tempo em dias somado à fórmula e convertido em minutos
          resultMin = Math.max(0, Math.round((durationDays + baseMath) * 1440));
          if (hasFormulaText) {
            detailedFormula = `(${durationMin}m ÷ 1440 = ${durationDaysFormatted} + ${baseMath}d) × 1440 = ${resultMin} min`;
            formulaLabel = `(${durationDaysFormatted} + ${mathFormula}) × 1440m`;
          } else {
            detailedFormula = `Tempo Apontado (${durationMin}m) = ${resultMin} min`;
            formulaLabel = 'Tempo Apontado (100%)';
          }
        } else {
          // Default for multiplication HH & GGF: multiply days by daily rate formula
          resultMin = Math.max(0, Math.round(durationDays * baseMath));
          if (hasFormulaText) {
            detailedFormula = `${durationMin}m ÷ 1440 = ${durationDaysFormatted} × ${mathFormula} (${baseMath}m/dia) = ${resultMin} min`;
            formulaLabel = `${durationDaysFormatted} × ${mathFormula}`;
          } else {
            detailedFormula = `Tempo em Dias (${durationDaysFormatted}) = ${resultMin} min`;
            formulaLabel = `Dias (${durationDaysFormatted})`;
          }
        }
      } else {
        resultMin = Math.max(0, Math.round(baseMath));
        if (hasFormulaText) {
          detailedFormula = `${mathFormula} = ${resultMin} min (Fixo)`;
          formulaLabel = `${mathFormula} (Fixo)`;
        } else {
          detailedFormula = `Fórmula Fixa (${resultMin} min)`;
          formulaLabel = 'Valor Fixo (0 min)';
        }
      }
    }
  } else {
    // Standard minute-based calculation
    baseMath = safeEvaluateMath(mathFormula);
    if (includeProcessDuration) {
      resultMin = Math.round(durationMin + baseMath);
      if (hasFormulaText) {
        detailedFormula = `${mathFormula} (${baseMath}m) + Tempo Apontado (${durationMin}m) = ${resultMin} min`;
        formulaLabel = `${mathFormula} + Tempo Apontado`;
      } else {
        detailedFormula = `Tempo Apontado (${durationMin}m) = ${resultMin} min`;
        formulaLabel = 'Tempo Apontado (100%)';
      }
    } else {
      resultMin = Math.round(baseMath);
      if (hasFormulaText) {
        detailedFormula = `${mathFormula} = ${resultMin} min`;
        formulaLabel = `${mathFormula}`;
      } else {
        detailedFormula = `Fórmula Fixa (${resultMin} min)`;
        formulaLabel = 'Valor Fixo (0 min)';
      }
    }
  }

  return {
    resultMin: Math.max(0, resultMin),
    baseMath,
    formulaLabel,
    detailedFormula,
    criterionText,
    mathFormula,
    includeProcessDuration,
    isDayBased,
    durationDays,
  };
}

/**
 * Calculates driver minutes (HH, HM, or GGF) from actual duration based on configured rule
 */
export function calculateDriverMinutes(
  durationMin: number,
  stdDriverMin: number,
  config?: StageDriverRuleConfig,
  context?: DriverRuleEvaluationContext
): number {
  if (!config || durationMin <= 0) return durationMin;

  // Prioritize new math formula if configured or mode is custom_formula
  if (config.mathFormula !== undefined || config.includeProcessDuration !== undefined) {
    const evaluated = evaluateConfigFormula(config, durationMin, context);
    return evaluated.resultMin;
  }

  // Se houver formulaItems configurados, calcula através da fórmula matemática dinâmica
  if (config.formulaItems && config.formulaItems.length > 0) {
    const evaluated = evaluateFormulaItems(config.formulaItems, durationMin, stdDriverMin, context);
    return evaluated.resultMin;
  }

  switch (config.mode) {
    case 'process_plus_offset': {
      // Offset de tempo (ex: +30 min vapor HM, +3 min montagem HH por escala)
      let offset = config.offsetMinutes ?? 0;
      if (context?.scaleName && config.scaleOffsets && config.scaleOffsets[context.scaleName] !== undefined) {
        offset = config.scaleOffsets[context.scaleName];
      }
      return Math.max(0, durationMin + offset);
    }

    case 'sampling_routine': {
      // Rotina de amostragem periódica + checklists (ex: Multiplicação)
      const intervalHours = config.sampleIntervalHours && config.sampleIntervalHours > 0 ? config.sampleIntervalHours : 4;
      const sampleMin = config.sampleDurationMin !== undefined ? config.sampleDurationMin : 15;
      const initChecklist = config.initialChecklistMin ?? 20;
      const shiftChecklist = config.shiftChecklistMin ?? 10;
      const ops = typeof config.operatorsCount === 'number' && config.operatorsCount > 0 ? config.operatorsCount : 1;

      const durationHours = durationMin / 60;
      // Quantidade de coletas ao longo do tempo de processo
      const samplesCount = Math.max(1, Math.round(durationHours / intervalHours));
      // Quantidade de trocas de turno (a cada 8h de batelada)
      const shiftsCount = Math.floor(durationHours / 8);

      const totalMinutes = initChecklist + (samplesCount * sampleMin * ops) + (shiftsCount * shiftChecklist * ops);
      return Math.round(totalMinutes);
    }

    case 'sum_stages': {
      // Soma do tempo de processo com etapas vinculadas (ex: Abastecimento + Preparo)
      let combinedDuration = durationMin;
      if (config.linkedStageIds && config.linkedStageIds.length > 0 && context?.allStages) {
        config.linkedStageIds.forEach((linkedId) => {
          const linkedStage = context.allStages?.[linkedId];
          if (linkedStage && linkedStage.startTime && linkedStage.endTime) {
            const { diff } = calculateMinutesDiff(
              linkedStage.startTime,
              linkedStage.endTime,
              linkedStage.startDate || context.defaultDate,
              linkedStage.endDate || linkedStage.startDate || context.defaultDate
            );
            combinedDuration += diff;
          }
        });
      }
      const pct = typeof config.percentage === 'number' ? config.percentage : 100;
      const ops = typeof config.operatorsCount === 'number' && config.operatorsCount > 0 ? config.operatorsCount : 1;
      return Math.round(combinedDuration * (pct / 100) * ops);
    }

    case 'percentage_duration': {
      const pct = typeof config.percentage === 'number' ? config.percentage : 100;
      const ops = typeof config.operatorsCount === 'number' && config.operatorsCount > 0 ? config.operatorsCount : 1;
      return Math.round(durationMin * (pct / 100) * ops);
    }

    case 'fixed_value': {
      return typeof config.fixedMinutes === 'number' ? config.fixedMinutes : stdDriverMin;
    }

    case 'standard_plus_excess': {
      const base = typeof config.fixedMinutes === 'number' ? config.fixedMinutes : stdDriverMin;
      const excess = Math.max(0, durationMin - stdDriverMin);
      const excessPct = typeof config.excessPercentage === 'number' ? config.excessPercentage : 10;
      return Math.round(base + (excess * (excessPct / 100)));
    }

    case 'full_duration':
    default:
      return durationMin;
  }
}

/**
 * Returns a human-readable explanation in Portuguese of the calculation formula applied
 */
export function explainDriverCalculation(
  durationMin: number,
  stdDriverMin: number,
  config?: StageDriverRuleConfig,
  context?: DriverRuleEvaluationContext,
  driverName?: 'HH' | 'HM' | 'GGF'
): { formulaLabel: string; detailedFormula: string; resultMin: number } {
  if (!config) {
    return {
      formulaLabel: 'Tempo Integral (100%)',
      detailedFormula: `Duração do Processo (${durationMin} min)`,
      resultMin: durationMin,
    };
  }

  // Prioritize new math formula if configured or mode is custom_formula
  if (config.mathFormula !== undefined || config.includeProcessDuration !== undefined) {
    const evaluated = evaluateConfigFormula(config, durationMin, context);
    return {
      formulaLabel: evaluated.formulaLabel,
      detailedFormula: evaluated.detailedFormula,
      resultMin: evaluated.resultMin,
    };
  }

  // Se houver formulaItems configurados
  if (config.formulaItems && config.formulaItems.length > 0) {
    return evaluateFormulaItems(config.formulaItems, durationMin, stdDriverMin, context);
  }

  const resultMin = calculateDriverMinutes(durationMin, stdDriverMin, config, context);

  switch (config.mode) {
    case 'process_plus_offset': {
      let offset = config.offsetMinutes ?? 0;
      let scaleTag = '';
      if (context?.scaleName && config.scaleOffsets && config.scaleOffsets[context.scaleName] !== undefined) {
        offset = config.scaleOffsets[context.scaleName];
        scaleTag = ` (escala ${context.scaleName})`;
      }
      const label = config.offsetLabel || 'Adicional';
      return {
        formulaLabel: `Tempo de Processo + ${offset}m ${label}`,
        detailedFormula: `${durationMin}m (Processo) + ${offset}m (${label}${scaleTag}) = ${resultMin}m`,
        resultMin,
      };
    }

    case 'sampling_routine': {
      const intervalHours = config.sampleIntervalHours || 4;
      const sampleMin = config.sampleDurationMin ?? 15;
      const initChecklist = config.initialChecklistMin ?? 20;
      const shiftChecklist = config.shiftChecklistMin ?? 10;
      const durationHours = durationMin / 60;
      const samplesCount = Math.max(1, Math.round(durationHours / intervalHours));
      const shiftsCount = Math.floor(durationHours / 8);

      return {
        formulaLabel: `Amostras a cada ${intervalHours}h (${sampleMin}m) + Checklists`,
        detailedFormula: `${initChecklist}m (Checklist Inicial) + ${samplesCount} amostras × ${sampleMin}m (${samplesCount * sampleMin}m) + ${shiftsCount} turnos × ${shiftChecklist}m (${shiftsCount * shiftChecklist}m) = ${resultMin}m`,
        resultMin,
      };
    }

    case 'sum_stages': {
      return {
        formulaLabel: 'Soma de Etapas Vinculadas',
        detailedFormula: config.customFormulaDescription || `Tempo da Etapa (${durationMin}m) + Etapas Vinculadas = ${resultMin}m`,
        resultMin,
      };
    }

    case 'percentage_duration': {
      const pct = config.percentage ?? 100;
      const ops = config.operatorsCount ?? 1;
      return {
        formulaLabel: `${pct}% da Duração ${ops > 1 ? `× ${ops} Operadores` : ''}`,
        detailedFormula: `${durationMin}m × ${pct}% ${ops > 1 ? `× ${ops} ops` : ''} = ${resultMin}m`,
        resultMin,
      };
    }

    case 'fixed_value': {
      const fix = config.fixedMinutes ?? stdDriverMin;
      return {
        formulaLabel: `Valor Fixo (${fix} min)`,
        detailedFormula: `Constante fixa por batelada = ${fix}m`,
        resultMin,
      };
    }

    case 'standard_plus_excess': {
      const base = config.fixedMinutes ?? stdDriverMin;
      const excess = Math.max(0, durationMin - stdDriverMin);
      const excessPct = config.excessPercentage ?? 10;
      return {
        formulaLabel: `Standard (${base}m) + ${excessPct}% Excesso`,
        detailedFormula: `${base}m (Base) + ${excess}m excesso × ${excessPct}% = ${resultMin}m`,
        resultMin,
      };
    }

    case 'full_duration':
    default:
      return {
        formulaLabel: 'Tempo do Processo (100%)',
        detailedFormula: `Tempo de início ao fim apontado = ${durationMin}m`,
        resultMin: durationMin,
      };
  }
}

/**
 * Parses "HH:MM" string to minutes from 00:00
 */
export function timeStringToMinutes(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Calculates duration in minutes between start and end times and dates.
 * Accurately handles:
 * - Specific start date and end date spanning across multiple days (e.g. 2026-08-20 10:00 to 2026-08-23 18:00 = 4800 min)
 * - Overnight / midnight shifts (e.g. 23:00 to 02:30 = 210 min)
 * - Standard same-day shifts
 */
export function calculateMinutesDiff(
  startTime: string,
  endTime: string,
  startDate?: string,
  endDate?: string
): { diff: number; isOvernight: boolean; isMultiDay: boolean; daysCount: number } {
  if (!startTime || !endTime) {
    return { diff: 0, isOvernight: false, isMultiDay: false, daysCount: 0 };
  }

  let sDate = (startDate || '').trim();
  let eDate = (endDate || '').trim();
  let sTime = startTime.trim();
  let eTime = endTime.trim();

  // If ISO string like "2026-08-24T10:00"
  if (sTime.includes('T')) {
    const parts = sTime.split('T');
    sDate = sDate || parts[0];
    sTime = parts[1].slice(0, 5);
  }
  if (eTime.includes('T')) {
    const parts = eTime.split('T');
    eDate = eDate || parts[0];
    eTime = parts[1].slice(0, 5);
  }

  // If both start date and end date are available
  if (sDate && eDate) {
    try {
      const sParts = sTime.split(':');
      const eParts = eTime.split(':');
      if (sParts.length >= 2 && eParts.length >= 2) {
        const startDateTime = new Date(`${sDate}T${sParts[0].padStart(2, '0')}:${sParts[1].padStart(2, '0')}:00`);
        const endDateTime = new Date(`${eDate}T${eParts[0].padStart(2, '0')}:${eParts[1].padStart(2, '0')}:00`);
        
        if (!isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime())) {
          const diffMs = endDateTime.getTime() - startDateTime.getTime();
          const diff = Math.max(0, Math.round(diffMs / (1000 * 60)));
          const daysCount = Math.floor(diff / 1440);
          const isMultiDay = diff >= 1440 || sDate !== eDate;
          const isOvernight = !isMultiDay && sTime > eTime;
          return { diff, isOvernight, isMultiDay, daysCount };
        }
      }
    } catch {
      // Fallback below
    }
  }

  // If only start date is provided and end time is earlier, assume next day
  const startMin = timeStringToMinutes(sTime);
  const endMin = timeStringToMinutes(eTime);

  if (startMin === null || endMin === null) {
    return { diff: 0, isOvernight: false, isMultiDay: false, daysCount: 0 };
  }

  if (endMin >= startMin) {
    return { diff: endMin - startMin, isOvernight: false, isMultiDay: false, daysCount: 0 };
  } else {
    // Crosses midnight (e.g. 22:00 to 01:00 = 180 min)
    return { diff: 1440 - startMin + endMin, isOvernight: true, isMultiDay: false, daysCount: 1 };
  }
}

/**
 * Computes metrics for a single stage record:
 * - Duração Real (min)
 * - Variação em Minutos = Duração Real - Standard
 * - Variação Percentual (%) = (Standard / Duração Real) * 100
 * - Variações de Custo / Driver: Hora Homem (HH), Hora Máquina (HM) e Gastos Gerais de Fabricação (GGF)
 * - Status:
 *     - >= 100%: Verde (No prazo ou adiantado / Alta Eficiência)
 *     - 85% a 99%: Amarelo/Laranja (Atenção / Pequeno desvio)
 *     - < 85%: Vermelho (Desvio crítico / Gargalo)
 */
/**
 * Computes metrics for a single stage record based on Rule 2 (Fixed standard times per stage and scale):
 * - Duração Real (min) do relógio
 * - HH Real vs. HH Standard (Fixo por Etapa/Escala) -> Variação HH
 * - HM Real vs. HM Standard (Fixo por Etapa/Escala) -> Variação HM
 * - GGF Real vs. GGF Standard (Fixo por Etapa/Escala) -> Variação GGF
 * - Status individualizado por conformidade de HH, HM e GGF
 */
export function calcStageMetrics(
  stage: StageRecord | undefined,
  defaultDate?: string,
  stageId?: ProcessStageId,
  customRules?: CostDriverRule[],
  orderContext?: {
    scaleName?: string;
    bioreactorId?: string;
    productName?: string;
    product?: ProductPreset;
    allStages?: Record<string, StageRecord>;
  },
  customThresholds?: VarianceThresholdConfig
): StageCalculatedMetrics {
  if (!stage || !stage.startTime || !stage.endTime) {
    const defaultStdMin = stage?.standardMin || 60;
    const stdBreakdown = stage?.setupCostBreakdown || getDefaultStageCostBreakdown(defaultStdMin);
    return {
      durationMin: 0,
      varianceMin: 0,
      variancePercent: 0,
      status: 'pending',
      isOvernight: false,
      isMultiDay: false,
      daysCount: 0,
      isFilled: false,
      costMetrics: {
        standard: stdBreakdown,
        real: { hhMin: 0, hmMin: 0, ggfMin: 0 },
        variance: {
          hhMin: 0,
          hmMin: 0,
          ggfMin: 0,
          hhPercent: 0,
          hmPercent: 0,
          ggfPercent: 0,
        },
      },
    };
  }

  const sDate = stage.startDate || defaultDate;
  const eDate = stage.endDate || stage.startDate || defaultDate;

  const { diff: durationMin, isOvernight, isMultiDay, daysCount } = calculateMinutesDiff(
    stage.startTime,
    stage.endTime,
    sDate,
    eDate
  );

  // Standards fixos da etapa e escala (HH, HM, GGF)
  let stdBreakdown: StageCostBreakdown | undefined = stage?.setupCostBreakdown;

  // Se não houver breakdown ou se for zero, busca no cadastro de Padrões do produto e escala
  if (!stdBreakdown || (stdBreakdown.hhMin === 0 && stdBreakdown.hmMin === 0 && stdBreakdown.ggfMin === 0)) {
    if (stageId) {
      const allPresets = getStoredProductPresets();
      const matchedProd =
        orderContext?.product ||
        (orderContext?.productName ? allPresets.find((p) => p.name === orderContext.productName) : undefined) ||
        allPresets[0];

      if (matchedProd && orderContext?.scaleName) {
        stdBreakdown = getProductStageCostBreakdown(
          matchedProd,
          orderContext.scaleName,
          stageId,
          stage?.standardMin
        );
      }
    }
  }

  if (!stdBreakdown) {
    stdBreakdown = getDefaultStageCostBreakdown(stage?.standardMin || 60);
  }

  // Regras de conversão de tempo configuradas pelo usuário
  const rules = customRules || getStoredCostDriverRules();
  const matchedRule = stageId ? rules.find((r) => r.stageId === stageId) : undefined;

  const calcContext = {
    scaleName: orderContext?.scaleName,
    bioreactorId: orderContext?.bioreactorId,
    productName: orderContext?.productName || orderContext?.product?.name,
    allStages: orderContext?.allStages,
    defaultDate,
    stageId,
  };

  // Cálculo de HH Real usando a regra configurada
  const realHhMin = calculateDriverMinutes(
    durationMin,
    stdBreakdown.hhMin,
    matchedRule?.hhRule,
    { ...calcContext, driverKey: 'hhRule' }
  );

  // Cálculo de HM Real usando a regra configurada
  const realHmMin = calculateDriverMinutes(
    durationMin,
    stdBreakdown.hmMin,
    matchedRule?.hmRule,
    { ...calcContext, driverKey: 'hmRule' }
  );

  // Cálculo de GGF Real usando a regra configurada
  const realGgfMin = calculateDriverMinutes(
    durationMin,
    stdBreakdown.ggfMin,
    matchedRule?.ggfRule,
    { ...calcContext, driverKey: 'ggfRule' }
  );

  const realBreakdown: StageCostBreakdown = {
    hhMin: realHhMin,
    hmMin: realHmMin,
    ggfMin: realGgfMin,
  };

  // Variações individuais em minutos (Real - Standard)
  const hhVarianceMin = realHhMin - stdBreakdown.hhMin;
  const hmVarianceMin = realHmMin - stdBreakdown.hmMin;
  const ggfVarianceMin = realGgfMin - stdBreakdown.ggfMin;

  // Variação percentual da regra do usuário: ((Standard - Real) / Standard) * 100
  const hhVariancePercent = stdBreakdown.hhMin > 0 ? ((stdBreakdown.hhMin - realHhMin) / stdBreakdown.hhMin) * 100 : (realHhMin === 0 ? 0 : -100);
  const hmVariancePercent = stdBreakdown.hmMin > 0 ? ((stdBreakdown.hmMin - realHmMin) / stdBreakdown.hmMin) * 100 : (realHmMin === 0 ? 0 : -100);
  const ggfVariancePercent = stdBreakdown.ggfMin > 0 ? ((stdBreakdown.ggfMin - realGgfMin) / stdBreakdown.ggfMin) * 100 : (realGgfMin === 0 ? 0 : -100);

  // Desvio consolidado do direcionador principal (HM/Gargalo)
  const primaryVarianceMin = hmVarianceMin;
  const primaryVariancePercent = hmVariancePercent;

  // Avaliação de conformidade por direcionador com base nas faixas configuradas
  const hhStatus = evaluateVarianceStatus(hhVarianceMin, hhVariancePercent, customThresholds);
  const hmStatus = evaluateVarianceStatus(hmVarianceMin, hmVariancePercent, customThresholds);

  let status: StageStatus = 'ok';
  if (hhStatus === 'critical' || hmStatus === 'critical') {
    status = 'critical';
  } else if (hhStatus === 'warning' || hmStatus === 'warning') {
    status = 'warning';
  } else {
    status = 'ok';
  }

  return {
    durationMin,
    varianceMin: primaryVarianceMin,
    variancePercent: primaryVariancePercent,
    status,
    isOvernight,
    isMultiDay,
    daysCount,
    isFilled: true,
    costMetrics: {
      standard: stdBreakdown,
      real: realBreakdown,
      variance: {
        hhMin: hhVarianceMin,
        hmMin: hmVarianceMin,
        ggfMin: ggfVarianceMin,
        hhPercent: hhVariancePercent,
        hmPercent: hmVariancePercent,
        ggfPercent: ggfVariancePercent,
      },
    },
  };
}

/**
 * Calculates unified/combined metrics for Abastecimento and Preparo together.
 * Preserves exact individual stage recordings while aggregating standard & real times
 * for HH, HM and GGF cost drivers and variance metrics.
 */
export function calcCombinedAbastecimentoPreparoMetrics(
  stages: Record<string, StageRecord> | undefined,
  defaultDate?: string,
  orderContext?: {
    scaleName?: string;
    bioreactorId?: string;
    productName?: string;
    product?: ProductPreset;
    allStages?: Record<string, StageRecord>;
  },
  customRules?: CostDriverRule[],
  customThresholds?: VarianceThresholdConfig
) {
  const abastStage = stages?.['abastecimento'];
  const prepStage = stages?.['preparo'];

  const abastMetrics = calcStageMetrics(
    abastStage,
    defaultDate,
    'abastecimento',
    customRules,
    orderContext,
    customThresholds
  );

  const prepMetrics = calcStageMetrics(
    prepStage,
    defaultDate,
    'preparo',
    customRules,
    orderContext,
    customThresholds
  );

  const isAbastFilled = abastMetrics.isFilled;
  const isPrepFilled = prepMetrics.isFilled;
  const isFilled = isAbastFilled || isPrepFilled;

  // Real duration sum
  const durationMin = (isAbastFilled ? abastMetrics.durationMin : 0) + (isPrepFilled ? prepMetrics.durationMin : 0);

  // Standard breakdown sum
  const stdHh = (abastMetrics.costMetrics?.standard.hhMin || 0) + (prepMetrics.costMetrics?.standard.hhMin || 0);
  const stdHm = (abastMetrics.costMetrics?.standard.hmMin || 0) + (prepMetrics.costMetrics?.standard.hmMin || 0);
  const stdGgf = (abastMetrics.costMetrics?.standard.ggfMin || 0) + (prepMetrics.costMetrics?.standard.ggfMin || 0);

  // Real breakdown sum
  const realHh = (isAbastFilled ? abastMetrics.costMetrics?.real.hhMin || 0 : 0) + (isPrepFilled ? prepMetrics.costMetrics?.real.hhMin || 0 : 0);
  const realHm = (isAbastFilled ? abastMetrics.costMetrics?.real.hmMin || 0 : 0) + (isPrepFilled ? prepMetrics.costMetrics?.real.hmMin || 0 : 0);
  const realGgf = (isAbastFilled ? abastMetrics.costMetrics?.real.ggfMin || 0 : 0) + (isPrepFilled ? prepMetrics.costMetrics?.real.ggfMin || 0 : 0);

  // Variances (Real - Standard)
  const hhVarMin = realHh - stdHh;
  const hmVarMin = realHm - stdHm;
  const ggfVarMin = realGgf - stdGgf;

  // Variance %: ((Std - Real) / Std) * 100
  const hhVarPct = stdHh > 0 ? ((stdHh - realHh) / stdHh) * 100 : (realHh === 0 ? 0 : -100);
  const hmVarPct = stdHm > 0 ? ((stdHm - realHm) / stdHm) * 100 : (realHm === 0 ? 0 : -100);
  const ggfVarPct = stdGgf > 0 ? ((stdGgf - realGgf) / stdGgf) * 100 : (realGgf === 0 ? 0 : -100);

  // Evaluate status
  let status: StageStatus = 'pending';
  if (isFilled) {
    const hhStatus = evaluateVarianceStatus(hhVarMin, hhVarPct, customThresholds);
    const hmStatus = evaluateVarianceStatus(hmVarMin, hmVarPct, customThresholds);
    if (hhStatus === 'critical' || hmStatus === 'critical') {
      status = 'critical';
    } else if (hhStatus === 'warning' || hmStatus === 'warning') {
      status = 'warning';
    } else {
      status = 'ok';
    }
  }

  // Combined start / end date & time display
  const startObj = isAbastFilled && abastStage?.startTime
    ? { date: abastStage.startDate || defaultDate, time: abastStage.startTime }
    : isPrepFilled && prepStage?.startTime
    ? { date: prepStage.startDate || defaultDate, time: prepStage.startTime }
    : null;

  const endObj = isPrepFilled && prepStage?.endTime
    ? { date: prepStage.endDate || defaultDate, time: prepStage.endTime }
    : isAbastFilled && abastStage?.endTime
    ? { date: abastStage.endDate || defaultDate, time: abastStage.endTime }
    : null;

  return {
    abastMetrics,
    prepMetrics,
    isFilled,
    durationMin,
    standardMin: stdHm || (abastStage?.standardMin || 0) + (prepStage?.standardMin || 0),
    varianceMin: hmVarMin,
    variancePercent: hmVarPct,
    status,
    startObj,
    endObj,
    costMetrics: {
      standard: { hhMin: stdHh, hmMin: stdHm, ggfMin: stdGgf },
      real: { hhMin: realHh, hmMin: realHm, ggfMin: realGgf },
      variance: {
        hhMin: hhVarMin,
        hmMin: hmVarMin,
        ggfMin: ggfVarMin,
        hhPercent: hhVarPct,
        hmPercent: hmVarPct,
        ggfPercent: ggfVarPct,
      },
    },
  };
}

/**
 * Calculates aggregated order totals and status dynamically across stages,
 * strictly consolidating HH (Hora Homem), HM (Hora Máquina), and GGF.
 */
export function calcOrderTotals(
  order: ProductionOrder,
  customRules?: CostDriverRule[],
  customThresholds?: VarianceThresholdConfig
): OrderTotalMetrics {
  let totalRealMin = 0;
  let totalStandardMin = 0;
  let completedStagesCount = 0;
  let maxVarianceMin = -Infinity;
  let criticalStageId: ProcessStageId | undefined;

  let stdHhTotal = 0;
  let stdHmTotal = 0;
  let stdGgfTotal = 0;

  let realHhTotal = 0;
  let realHmTotal = 0;
  let realGgfTotal = 0;

  const stageKeys = Object.keys(order.stages || {});
  const keysToEvaluate = stageKeys.length > 0 ? stageKeys : PROCESS_STAGES.map((s) => s.id);

  keysToEvaluate.forEach((key) => {
    const stage = order.stages?.[key];
    const metrics = calcStageMetrics(
      stage,
      order.prepDate,
      key as ProcessStageId,
      customRules,
      {
        scaleName: order.scaleName,
        bioreactorId: order.bioreactorId,
        productName: order.productName,
        allStages: order.stages,
      },
      customThresholds
    );
    if (stage) {
      const stdBreakdown = stage.setupCostBreakdown || getDefaultStageCostBreakdown(stage.standardMin || 60);
      stdHhTotal += stdBreakdown.hhMin;
      stdHmTotal += stdBreakdown.hmMin;
      stdGgfTotal += stdBreakdown.ggfMin;

      if (metrics.isFilled) {
        totalRealMin += metrics.durationMin;
        totalStandardMin += stdBreakdown.hmMin || stage.standardMin;
        completedStagesCount++;

        if (metrics.costMetrics) {
          realHhTotal += metrics.costMetrics.real.hhMin;
          realHmTotal += metrics.costMetrics.real.hmMin;
          realGgfTotal += metrics.costMetrics.real.ggfMin;
        }

        if (metrics.varianceMin > maxVarianceMin) {
          maxVarianceMin = metrics.varianceMin;
          criticalStageId = key;
        }
      }
    }
  });

  const totalVarianceMin = realHmTotal - stdHmTotal;
  const totalVariancePercent = stdHmTotal > 0 ? ((stdHmTotal - realHmTotal) / stdHmTotal) * 100 : 0;

  let overallStatus: StageStatus = 'pending';
  if (completedStagesCount > 0) {
    overallStatus = evaluateVarianceStatus(totalVarianceMin, totalVariancePercent, customThresholds);
  }

  const hasBottleneck = keysToEvaluate.some((k) => {
    const m = calcStageMetrics(
      order.stages?.[k],
      order.prepDate,
      k as ProcessStageId,
      customRules,
      {
        scaleName: order.scaleName,
        bioreactorId: order.bioreactorId,
        productName: order.productName,
        allStages: order.stages,
      },
      customThresholds
    );
    return m.isFilled && m.status === 'critical';
  });

  // Consolidated Cost Totals (HH, HM, GGF) using the user's formula: ((Standard - Real) / Standard) * 100
  const costTotals = {
    hh: {
      standardMin: stdHhTotal,
      realMin: realHhTotal,
      varianceMin: realHhTotal - stdHhTotal,
      variancePercent: stdHhTotal > 0 ? ((stdHhTotal - realHhTotal) / stdHhTotal) * 100 : (completedStagesCount === 0 ? 0 : (realHhTotal === 0 ? 0 : -100)),
    },
    hm: {
      standardMin: stdHmTotal,
      realMin: realHmTotal,
      varianceMin: realHmTotal - stdHmTotal,
      variancePercent: stdHmTotal > 0 ? ((stdHmTotal - realHmTotal) / stdHmTotal) * 100 : (completedStagesCount === 0 ? 0 : (realHmTotal === 0 ? 0 : -100)),
    },
    ggf: {
      standardMin: stdGgfTotal,
      realMin: realGgfTotal,
      varianceMin: realGgfTotal - stdGgfTotal,
      variancePercent: stdGgfTotal > 0 ? ((stdGgfTotal - realGgfTotal) / stdGgfTotal) * 100 : (completedStagesCount === 0 ? 0 : (realGgfTotal === 0 ? 0 : -100)),
    },
  };

  return {
    totalRealMin,
    totalStandardMin,
    totalVarianceMin,
    totalVariancePercent,
    overallStatus,
    completedStagesCount,
    totalStagesCount: keysToEvaluate.length,
    hasBottleneck,
    criticalStageId: maxVarianceMin > 0 ? criticalStageId : undefined,
    criticalVarianceMin: maxVarianceMin > 0 ? maxVarianceMin : 0,
    costTotals,
  };
}

/**
 * Formats minutes into standard readable industrial format (e.g. "76h (3d 4h)", "14h 35m", or "45m")
 */
export function formatMinutes(minutes: number, verbose: boolean = false): string {
  if (isNaN(minutes)) return '0m';
  const absMin = Math.abs(Math.round(minutes));
  const hours = Math.floor(absMin / 60);
  const mins = absMin % 60;
  const prefix = minutes < 0 ? '-' : '';

  if (absMin === 0) return '0 min';

  // For multi-day durations (>= 24 hours / 1440 min)
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    let dayStr = `${days}d`;
    if (remHours > 0) dayStr += ` ${remHours}h`;
    if (mins > 0) dayStr += ` ${mins}m`;

    if (mins === 0) {
      return `${prefix}${hours}h (${dayStr})`;
    }
    return `${prefix}${hours}h ${mins}m (${dayStr})`;
  }

  if (hours === 0) {
    return `${prefix}${mins} min`;
  }
  if (mins === 0) {
    return `${prefix}${hours}h`;
  }
  return verbose ? `${prefix}${hours}h ${mins}min` : `${prefix}${hours}h ${mins}m`;
}

/**
 * Formats percentage (e.g. +3.2%, -4.9%, 0.0%)
 */
export function formatPercent(value: number, showPlus = true): string {
  if (isNaN(value)) return '0.0%';
  const prefix = showPlus && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

/**
 * Returns Tailwind color classes based on stage status
 */
export function getStatusTheme(status: StageStatus) {
  switch (status) {
    case 'ok':
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        pill: 'bg-emerald-500',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        label: 'No Prazo',
        subLabel: 'Variação >= 100%',
      };
    case 'warning':
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        pill: 'bg-amber-500',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        label: 'Atenção',
        subLabel: 'Variação 85% - 99%',
      };
    case 'critical':
      return {
        bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        pill: 'bg-rose-500',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        label: 'Crítico / Gargalo',
        subLabel: 'Variação < 85%',
      };
    case 'pending':
    default:
      return {
        bg: 'bg-slate-800/40 border-slate-700/50 text-slate-400',
        badge: 'bg-slate-800 text-slate-400 border-slate-700',
        pill: 'bg-slate-600',
        text: 'text-slate-400',
        border: 'border-slate-700/50',
        label: 'Em Espera',
        subLabel: 'Horários Pendentes',
      };
  }
}

/**
 * Finds matching ScaleStandardConfig for a product and scale identifier or volume
 */
export function getMatchingScaleConfig(
  product: ProductPreset | undefined,
  scaleIdentifier: string | number
): ScaleStandardConfig | null {
  if (!product || !product.scales || !Array.isArray(product.scales) || product.scales.length === 0) {
    return null;
  }

  const strId = String(scaleIdentifier ?? '').trim().toLowerCase();
  const numVol = typeof scaleIdentifier === 'number' ? scaleIdentifier : parseInt(strId.replace(/\D/g, ''), 10);

  // 1. Exact or normalized scale name/id match (e.g. "100L", "500L", "3000L", "5000L", "scale-100")
  const exactNameMatch = product.scales.find((s) => {
    if (!s) return false;
    const sName = (s.scaleName || '').trim().toLowerCase();
    const sId = (s.scaleId || '').trim().toLowerCase();
    return (
      (sName !== '' && sName === strId) ||
      (sId !== '' && sId === strId) ||
      (sName !== '' && sName.replace(/\s+/g, '') === strId.replace(/\s+/g, '')) ||
      (sName !== '' && sName.replace(/[^0-9a-z]/g, '') === strId.replace(/[^0-9a-z]/g, ''))
    );
  });
  if (exactNameMatch) return exactNameMatch;

  // 2. Exact volume match
  if (!isNaN(numVol) && numVol > 0) {
    const exactVolMatch = product.scales.find((s) => s && s.volumeLiters === numVol);
    if (exactVolMatch) return exactVolMatch;

    // 3. Match if scaleName contains the numeric digits
    const nameNumMatch = product.scales.find((s) => {
      if (!s || !s.scaleName) return false;
      const parsed = parseInt(s.scaleName.replace(/\D/g, ''), 10);
      return !isNaN(parsed) && parsed === numVol;
    });
    if (nameNumMatch) return nameNumMatch;

    // 4. Closest volume
    let closest = product.scales[0];
    let minDiff = Infinity;
    for (const scale of product.scales) {
      if (!scale) continue;
      const vol = typeof scale.volumeLiters === 'number' ? scale.volumeLiters : 0;
      const diff = Math.abs(vol - numVol);
      if (diff < minDiff) {
        minDiff = diff;
        closest = scale;
      }
    }
    return closest || null;
  }

  return product.scales[0] || null;
}

/**
 * Returns standard minutes for each stage for a specific product and scale
 */
export function getProductStandardForScale(
  product: ProductPreset | undefined,
  scaleIdentifier: string | number,
  allStages: StageDefinition[] = PROCESS_STAGES
): Record<string, number> {
  const defaultFallback: Record<string, number> = {};
  (allStages || PROCESS_STAGES).forEach((st) => {
    if (st && st.id) {
      defaultFallback[st.id] = st.defaultStandardMin || 60;
    }
  });

  if (!product) return defaultFallback;

  const matchedScale = getMatchingScaleConfig(product, scaleIdentifier);
  if (matchedScale && matchedScale.stagesStandardMin) {
    const result: Record<string, number> = {};
    (allStages || PROCESS_STAGES).forEach((st) => {
      if (st && st.id) {
        result[st.id] =
          matchedScale.stagesStandardMin[st.id] ??
          product.stagesStandardMin?.[st.id] ??
          st.defaultStandardMin ??
          60;
      }
    });
    return result;
  }

  if (product.stagesStandardMin) {
    const result: Record<string, number> = {};
    (allStages || PROCESS_STAGES).forEach((st) => {
      if (st && st.id) {
        result[st.id] = product.stagesStandardMin?.[st.id] ?? st.defaultStandardMin ?? 60;
      }
    });
    return result;
  }

  return defaultFallback;
}

/**
 * Returns standard minutes for each stage based on product and bioreactor code
 */
export function getProductStandardForBioreactor(
  product: ProductPreset | undefined,
  bioreactorCode: string,
  bioreactors: BioreactorItem[],
  allStages: StageDefinition[] = PROCESS_STAGES
): Record<string, number> {
  const bioreactor = bioreactors.find((b) => b.code === bioreactorCode);
  const scaleId = bioreactor?.scaleName || bioreactor?.capacityLiters || 5000;
  return getProductStandardForScale(product, scaleId, allStages);
}

/**
 * Generates or normalizes default Setup Cost Breakdown (HH, HM, GGF) based on total standard minutes
 */
export function getDefaultStageCostBreakdown(totalMin: number): StageCostBreakdown {
  const safeTotal = Math.max(1, Math.round(totalMin));
  const hh = Math.round(safeTotal * 0.45);
  const hm = Math.round(safeTotal * 0.35);
  const ggf = Math.max(0, safeTotal - hh - hm);
  return {
    hhMin: hh,
    hmMin: hm,
    ggfMin: ggf,
  };
}

/**
 * Returns the StageCostBreakdown (HH, HM, GGF) for a given product, scale, and stage
 */
export function getProductStageCostBreakdown(
  product: ProductPreset | undefined,
  scaleIdentifier: string | number,
  stageId: string,
  fallbackStandardMin?: number
): StageCostBreakdown {
  if (!product) {
    return getDefaultStageCostBreakdown(fallbackStandardMin || 60);
  }

  const matchedScale = getMatchingScaleConfig(product, scaleIdentifier);
  if (matchedScale && matchedScale.setupCostBreakdown?.[stageId]) {
    const b = matchedScale.setupCostBreakdown[stageId];
    return {
      hhMin: Number(b.hhMin) || 0,
      hmMin: Number(b.hmMin) || 0,
      ggfMin: Number(b.ggfMin) || 0,
    };
  }

  const stageStandard =
    matchedScale?.stagesStandardMin?.[stageId] ??
    product.stagesStandardMin?.[stageId] ??
    fallbackStandardMin ??
    60;

  return getDefaultStageCostBreakdown(stageStandard);
}

/**
 * Helper to ensure a product contains all standard production scales (100L, 500L, 3000L, 5000L, etc.)
 */
export function ensureAllProductScales(
  product: ProductPreset,
  availableScales: { id: string; name: string; volumeLiters: number }[] = [
    { id: 'scale-100', name: '100L', volumeLiters: 100 },
    { id: 'scale-500', name: '500L', volumeLiters: 500 },
    { id: 'scale-3000', name: '3000L', volumeLiters: 3000 },
    { id: 'scale-5000', name: '5000L', volumeLiters: 5000 },
  ]
): ScaleStandardConfig[] {
  const existingScales = product.scales || [];

  // Map each standard scale to its existing or default configuration
  const result: ScaleStandardConfig[] = availableScales.map((scaleDef) => {
    const match = existingScales.find((s) => {
      if (!s) return false;
      const sName = (s.scaleName || '').toLowerCase();
      const sId = (s.scaleId || '').toLowerCase();
      const defName = (scaleDef?.name || '').toLowerCase();
      const defId = (scaleDef?.id || '').toLowerCase();
      return (
        (sName !== '' && sName === defName) ||
        (sId !== '' && sId === defId) ||
        (sName !== '' && sName.replace(/[^0-9a-z]/g, '') === defName.replace(/[^0-9a-z]/g, ''))
      );
    });

    const stagesMin = {
      setup: match?.stagesStandardMin?.setup ?? (scaleDef.volumeLiters <= 100 ? 30 : scaleDef.volumeLiters <= 500 ? 45 : scaleDef.volumeLiters <= 3000 ? 60 : 75),
      abastecimento: match?.stagesStandardMin?.abastecimento ?? (scaleDef.volumeLiters <= 100 ? 20 : scaleDef.volumeLiters <= 500 ? 30 : scaleDef.volumeLiters <= 3000 ? 45 : 60),
      preparo: match?.stagesStandardMin?.preparo ?? (scaleDef.volumeLiters <= 100 ? 40 : scaleDef.volumeLiters <= 500 ? 60 : scaleDef.volumeLiters <= 3000 ? 90 : 120),
      inoculacao: match?.stagesStandardMin?.inoculacao ?? (scaleDef.volumeLiters <= 100 ? 15 : scaleDef.volumeLiters <= 500 ? 20 : scaleDef.volumeLiters <= 3000 ? 30 : 42),
      multiplicacao: match?.stagesStandardMin?.multiplicacao ?? (scaleDef.volumeLiters <= 100 ? 360 : scaleDef.volumeLiters <= 500 ? 480 : scaleDef.volumeLiters <= 3000 ? 600 : 720),
      ...(match?.stagesStandardMin || {}),
    };

    const costBreakdown: Record<string, StageCostBreakdown> = { ...(match?.setupCostBreakdown || {}) };
    Object.keys(stagesMin).forEach((sId) => {
      if (!costBreakdown[sId]) {
        if (sId === 'inoculacao') {
          // Default custom standard breakdown for inoculação (HH: 5, HM: 32, GGF: 5 for 5000L or proportional)
          if (scaleDef.volumeLiters >= 5000) {
            costBreakdown[sId] = { hhMin: 5, hmMin: 32, ggfMin: 5 };
          } else if (scaleDef.volumeLiters >= 3000) {
            costBreakdown[sId] = { hhMin: 5, hmMin: 20, ggfMin: 5 };
          } else if (scaleDef.volumeLiters >= 500) {
            costBreakdown[sId] = { hhMin: 4, hmMin: 14, ggfMin: 2 };
          } else {
            costBreakdown[sId] = { hhMin: 3, hmMin: 10, ggfMin: 2 };
          }
        } else {
          costBreakdown[sId] = getDefaultStageCostBreakdown(stagesMin[sId as keyof typeof stagesMin] || 60);
        }
      }
    });

    if (match) {
      return {
        ...match,
        scaleId: match.scaleId || scaleDef.id,
        scaleName: match.scaleName || scaleDef.name,
        volumeLiters: match.volumeLiters || scaleDef.volumeLiters,
        stagesStandardMin: stagesMin,
        setupCostBreakdown: costBreakdown,
      };
    }

    return {
      scaleId: scaleDef.id,
      scaleName: scaleDef.name,
      volumeLiters: scaleDef.volumeLiters,
      stagesStandardMin: stagesMin,
      setupCostBreakdown: costBreakdown,
    };
  });

  // Preserve any additional custom scales beyond the standard 4
  existingScales.forEach((es) => {
    if (!es || !es.scaleName) return;
    const esName = es.scaleName.toLowerCase();
    if (!result.some((r) => (r.scaleName || '').toLowerCase() === esName)) {
      result.push(es);
    }
  });

  return result;
}

/**
 * Normalizes all product presets to guarantee every product has complete scale definitions
 */
export function normalizeProductPresets(
  presets: ProductPreset[],
  availableScales?: { id: string; name: string; volumeLiters: number }[]
): ProductPreset[] {
  return presets.map((p) => ({
    ...p,
    scales: ensureAllProductScales(p, availableScales),
  }));
}

/**
 * Retrieves the currently stored product presets from localStorage or defaults
 */
export function getStoredProductPresets(): ProductPreset[] {
  try {
    const saved = localStorage.getItem('biotime_presets_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeProductPresets(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to parse stored presets', e);
  }
  return normalizeProductPresets(PRODUCT_PRESETS);
}




