export type ProcessStageId = string;

export type StageStatus = 'ok' | 'warning' | 'critical' | 'pending';

export interface StageDefinition {
  id: ProcessStageId;
  label: string;
  shortLabel: string;
  defaultStandardMin: number;
  description: string;
  badgeColor: string;
  sequence: number;
}

export const PROCESS_STAGES: StageDefinition[] = [
  {
    id: 'setup',
    label: '1. Setup Inicial',
    shortLabel: 'Setup Inicial',
    defaultStandardMin: 60,
    description: 'Montagem, assepsia, testes de estanqueidade e esterilização do vaso (Passo 010).',
    badgeColor: 'blue',
    sequence: 1,
  },
  {
    id: 'abastecimento',
    label: '2. Abastecimento',
    shortLabel: 'Abastecimento',
    defaultStandardMin: 45,
    description: 'Carga de meio de cultura, água purificada e aditivos iniciais (Passo 020).',
    badgeColor: 'cyan',
    sequence: 2,
  },
  {
    id: 'preparo',
    label: '3. Preparo',
    shortLabel: 'Preparo',
    defaultStandardMin: 90,
    description: 'Ajuste e estabilização de parâmetros: pH, temperatura, aeração (Passo 030).',
    badgeColor: 'amber',
    sequence: 3,
  },
  {
    id: 'inoculacao',
    label: '4. Inoculação',
    shortLabel: 'Inoculação',
    defaultStandardMin: 30,
    description: 'Transferência de inóculo, vaporização de linhas e montagem asséptica (Passo 040).',
    badgeColor: 'indigo',
    sequence: 4,
  },
  {
    id: 'multiplicacao',
    label: '5. Multiplicação',
    shortLabel: 'Multiplicação',
    defaultStandardMin: 720,
    description: 'Fase de crescimento e fermentação biológica com coletas e checklists (Passo 050).',
    badgeColor: 'emerald',
    sequence: 5,
  },
];

export interface StageCostBreakdown {
  hhMin: number; // Hora Homem em Minutos (Padrão Fixo por Etapa/Escala)
  hmMin: number; // Hora Máquina em Minutos (Padrão Fixo por Etapa/Escala)
  ggfMin: number; // Gastos Gerais de Fabricação (GGF) em Minutos (Padrão Fixo por Etapa/Escala)
}

export type FormulaOperator = '+' | '*' | '-' | '/';

export type FormulaTermType =
  | 'process_duration'    // Tempo do Processo Apontado (duração real início ao fim)
  | 'fixed_number'        // Valor Numérico Fixo (ex: +30 min vapor, +15 min)
  | 'scale_offset'        // Valor Específico por Escala (ex: 100L=3, 500L=5, 3000L=10, 5000L=15)
  | 'linked_stage'        // Tempo de Outra Etapa Apontada (ex: Abastecimento, Setup)
  | 'percentage_factor'   // Porcentagem / Fator (ex: 100%, 50%, 10%)
  | 'operators_multiplier'// Multiplicador de Operadores (ex: 1, 2)
  | 'sampling_routine'    // Rotina de Amostras e Checklists Periódicos
  | 'standard_duration';  // Tempo Standard da Etapa

export interface FormulaTerm {
  id: string;
  type: FormulaTermType;
  label?: string; // Descrição opcional (ex: "Vapor de Linha", "Montagem do Sistema", "Tempo de Abastecimento")
  
  // Parâmetros específicos
  numericValue?: number; // Para fixed_number (ex: 30), percentage_factor (ex: 100), operators_multiplier (ex: 2)
  scaleOffsets?: Record<string, number>; // Para scale_offset (ex: { '100L': 3, '500L': 5, ... })
  linkedStageId?: ProcessStageId; // Para linked_stage (ex: 'abastecimento')
  
  // Para sampling_routine
  sampleIntervalHours?: number; // Intervalo de coleta (ex: 4h)
  sampleDurationMin?: number;   // Minutos por coleta (ex: 15m)
  initialChecklistMin?: number; // Checklist inicial (ex: 20m)
  shiftChecklistMin?: number;   // Checklist troca turno (ex: 10m)
}

export interface FormulaItem {
  operator?: FormulaOperator; // operador matemático (+, *, -, /) que liga ao termo anterior
  term: FormulaTerm;
}

export type DriverCalculationMode = 
  | 'custom_formula'      // Fórmula Matemática com Campos Dinâmicos (Soma, Multiplicação, etc.)
  | 'process_plus_offset' // Tempo do processo + Adicional (ex: +30 min vapor, +3 min montagem por escala)
  | 'sampling_routine'    // Rotina de amostragens e checklists periódicos durante o processo
  | 'sum_stages'          // Soma de tempos de processo de etapas vinculadas (ex: Abastecimento + Preparo)
  | 'percentage_duration' // % da duração real (ex: 100%, 50%, 10%)
  | 'fixed_value'         // Valor fixo em minutos por batelada
  | 'standard_plus_excess'// Valor standard fixo + % sobre o tempo excedente
  | 'full_duration';      // 100% do tempo de relógio (início ao fim)

export interface ScaleDriverOverride {
  criterionText?: string;
  mathFormula?: string;
  includeProcessDuration?: boolean;
  timeUnit?: 'minutes' | 'days';
  dayOperation?: 'multiply' | 'add' | 'expression';
}

export interface StageDriverRuleConfig {
  mode: DriverCalculationMode;
  criterionText?: string; // Texto corrido do critério
  mathFormula?: string;   // Expressão para fazer contas (ex: "17 + 40", "10 + 10", "30", "dias * 30", "15 * 2")
  includeProcessDuration?: boolean; // Sim/Não para considerar o tempo apontado de início e fim
  timeUnit?: 'minutes' | 'days'; // 'days' para converter o tempo apontado em dias (min / 1440)
  dayOperation?: 'multiply' | 'add' | 'expression'; // Operação ao considerar tempo em dias ('multiply': dias * formula, 'add': dias + formula)
  scaleOverrides?: Record<string, ScaleDriverOverride>; // Configurações específicas por escala padrão (100L, 500L, 3000L, 5000L)
  productScaleOverrides?: Record<string, Record<string, ScaleDriverOverride>>; // Configurações específicas por Produto e por Escala (ex: { 'Soja': { '5000L': { mathFormula: '15' } } })
  productOverrides?: Record<string, ScaleDriverOverride>; // Configurações padrão por Produto para todas as escalas
  
  formulaItems?: FormulaItem[]; // Construtor dinâmico de fórmula matemática
  percentage?: number;      // ex: 100 para 100%, 10 para 10%
  fixedMinutes?: number;    // ex: 30 min
  operatorsCount?: number;  // Multiplicador de operadores para HH (ex: 1, 2)
  excessPercentage?: number;// % aplicado caso a duração ultrapasse o standard
  
  // Regra: Tempo de Processo + Adicional (ex: Vapor / Montagem por escala)
  offsetMinutes?: number;   // Minutos adicionais gerais (ex: +30 min vapor)
  offsetLabel?: string;     // Descrição do adicional (ex: "Vaporização", "Montagem do Sistema")
  scaleOffsets?: Record<string, number>; // Adicional específico por escala (ex: { '100L': 3, '500L': 5, '3000L': 10, '5000L': 15 })
  
  // Regra: Rotina de Amostras e Checklists (ex: Multiplicação)
  sampleIntervalHours?: number; // Intervalo entre coletas de amostra (ex: a cada 4 horas)
  sampleDurationMin?: number;   // Duração de cada coleta/amostragem em minutos (ex: 15 min)
  initialChecklistMin?: number; // Duração do checklist inicial de partida (ex: 20 min)
  shiftChecklistMin?: number;   // Duração do checklist de troca de turno (ex: 10 min a cada 8h)

  // Regra: Soma de Etapas Vinculadas (ex: Abastecimento + Preparo)
  linkedStageIds?: ProcessStageId[]; // IDs de etapas somadas
  customFormulaDescription?: string; // Descrição legível em português
}

export interface CostDriverRule {
  stageId: ProcessStageId;
  stageLabel: string;
  hhRule: StageDriverRuleConfig;
  hmRule: StageDriverRuleConfig;
  ggfRule: StageDriverRuleConfig;
  description: string;
}

export const DEFAULT_COST_DRIVER_RULES: CostDriverRule[] = [
  {
    stageId: 'setup',
    stageLabel: '1. Setup Inicial (Passo 010)',
    hhRule: {
      mode: 'custom_formula',
      criterionText: 'Montagem, assepsia e esterilização inicial',
      mathFormula: '17 + 40',
      includeProcessDuration: true,
      percentage: 100,
      operatorsCount: 1,
    },
    hmRule: {
      mode: 'custom_formula',
      criterionText: 'Aquecimento e esterilização do biorreator',
      mathFormula: '0',
      includeProcessDuration: true,
      percentage: 100,
    },
    ggfRule: {
      mode: 'custom_formula',
      criterionText: 'Ocupação da sala limpa em setup',
      mathFormula: '0',
      includeProcessDuration: true,
      percentage: 100,
    },
    description: 'Etapa de preparação: 100% de dedicação do operador e da máquina.',
  },
  {
    stageId: 'abastecimento',
    stageLabel: '2. Abastecimento (Passo 020)',
    hhRule: {
      mode: 'custom_formula',
      criterionText: 'Carga de insumos e matérias-primas',
      mathFormula: '10 + 10',
      includeProcessDuration: false,
      percentage: 100,
      operatorsCount: 1,
    },
    hmRule: {
      mode: 'custom_formula',
      criterionText: 'Mistura inicial no vaso',
      mathFormula: '0',
      includeProcessDuration: true,
      percentage: 100,
    },
    ggfRule: {
      mode: 'custom_formula',
      criterionText: 'Ocupação da área fabril de abastecimento',
      mathFormula: '0',
      includeProcessDuration: true,
      percentage: 100,
    },
    description: 'Carga de matérias-primas e meios com operador em tempo integral.',
  },
  {
    stageId: 'preparo',
    stageLabel: '3. Preparo (Passo 030)',
    hhRule: {
      mode: 'custom_formula',
      criterionText: 'Ajustes de pH, aeração e temperatura',
      mathFormula: '0',
      includeProcessDuration: true,
      percentage: 100,
      operatorsCount: 1,
      customFormulaDescription: 'Tempo de abastecimento + Tempo de preparo',
    },
    hmRule: {
      mode: 'custom_formula',
      criterionText: 'Estabilização e aeração mecânica',
      mathFormula: '0',
      includeProcessDuration: true,
      percentage: 100,
    },
    ggfRule: {
      mode: 'custom_formula',
      criterionText: 'Consumo de utilidades e ocupação fabril',
      mathFormula: '0',
      includeProcessDuration: true,
      percentage: 100,
    },
    description: 'Tempo de abastecimento + Tempo de preparo = HH / HM / GGF tudo igual.',
  },
  {
    stageId: 'inoculacao',
    stageLabel: '4. Inoculação (Passo 040)',
    hhRule: {
      mode: 'custom_formula',
      criterionText: 'Montagem do sistema de transferência por escala',
      mathFormula: '3',
      includeProcessDuration: true,
      offsetMinutes: 3,
      offsetLabel: 'Montagem do Sistema',
      scaleOverrides: {
        '100L': { mathFormula: '3', includeProcessDuration: true, criterionText: 'Montagem 100L (3m)' },
        '500L': { mathFormula: '5', includeProcessDuration: true, criterionText: 'Montagem 500L (5m)' },
        '3000L': { mathFormula: '10', includeProcessDuration: true, criterionText: 'Montagem 3000L (10m)' },
        '5000L': { mathFormula: '15', includeProcessDuration: true, criterionText: 'Montagem 5000L (15m)' },
      },
      scaleOffsets: {
        '100L': 3,
        '500L': 5,
        '3000L': 10,
        '5000L': 15,
      },
      customFormulaDescription: 'Tempo do processo + Montagem do sistema (3 min no 100L, varia por escala)',
    },
    hmRule: {
      mode: 'custom_formula',
      criterionText: 'Vaporização de linha (30 min) + transferência',
      mathFormula: '30',
      includeProcessDuration: true,
      offsetMinutes: 30,
      offsetLabel: 'Vaporização de Linha / Esterilização',
      customFormulaDescription: 'Tempo do processo + 30 min de vapor',
    },
    ggfRule: {
      mode: 'custom_formula',
      criterionText: 'Ocupação da sala de inoculação',
      mathFormula: '0',
      includeProcessDuration: true,
      percentage: 100,
      customFormulaDescription: 'Tempo do processo (ocupação da área)',
    },
    description: 'HM = Tempo do processo + 30 min de vapor // HH = Tempo do processo + montagem por escala.',
  },
  {
    stageId: 'multiplicacao',
    stageLabel: '5. Multiplicação (Passo 050)',
    hhRule: {
      mode: 'custom_formula',
      criterionText: 'Checklist inicial e rotina de amostragem diária (HH em minutos proporcional aos dias de batelada)',
      mathFormula: 'dias * 30',
      includeProcessDuration: true,
      timeUnit: 'days',
      dayOperation: 'multiply',
      sampleIntervalHours: 4,
      sampleDurationMin: 15,
      initialChecklistMin: 20,
      shiftChecklistMin: 10,
      customFormulaDescription: 'Tempo apontado convertido em dias (min ÷ 1440) multiplicado pela fórmula diária e reconvertido em minutos',
    },
    hmRule: {
      mode: 'custom_formula',
      criterionText: 'Tempo total do biorreator em batelada (100%)',
      mathFormula: '0',
      includeProcessDuration: true,
      percentage: 100,
      timeUnit: 'minutes',
      customFormulaDescription: 'Tempo do processo apenas (100% de reator ligado)',
    },
    ggfRule: {
      mode: 'custom_formula',
      criterionText: 'Ocupação da sala de cultivo / fermentação (GGF em minutos proporcional aos dias de batelada)',
      mathFormula: 'dias * 30',
      includeProcessDuration: true,
      timeUnit: 'days',
      dayOperation: 'multiply',
      percentage: 100,
      customFormulaDescription: 'Tempo apontado convertido em dias (min ÷ 1440) multiplicado pela fórmula diária e reconvertido em minutos',
    },
    description: 'HH e GGF = Tempo apontado convertido em dias e calculado pela fórmula // HM = 100% de tempo de biorreator.',
  },
];

export interface StageRecord {
  startDate?: string; // 'YYYY-MM-DD'
  startTime: string;   // 'HH:MM'
  endDate?: string;     // 'YYYY-MM-DD'
  endTime: string;     // 'HH:MM'
  standardMin: number;
  setupCostBreakdown?: StageCostBreakdown; // Detalhamento de Setup: HH, HM, GGF
  notes?: string;
  completed?: boolean;
}

export interface StageCostMetrics {
  standard: StageCostBreakdown;
  real: StageCostBreakdown;
  variance: {
    hhMin: number;
    hmMin: number;
    ggfMin: number;
    hhPercent: number;
    hmPercent: number;
    ggfPercent: number;
  };
}

export interface StageCalculatedMetrics {
  durationMin: number;
  varianceMin: number;
  variancePercent: number;
  status: StageStatus;
  isOvernight: boolean;
  isMultiDay: boolean;
  daysCount: number;
  isFilled: boolean;
  costMetrics?: StageCostMetrics;
}

export type LinkedOrderRelationType = 'inoculo' | 'transferencia' | 'empenho' | 'filha';

export interface LinkedOrderInfo {
  linkedOrderId: string;      // ID or OP Number of the parent/linked order
  linkedOpNumber: string;     // ex: "OP-2026-001"
  relationType: LinkedOrderRelationType; // 'inoculo' (Inóculo / Batelada Mãe), 'transferencia', 'empenho', 'filha'
  volumeLiters?: number;      // volume empenhado/transferido em Litros
  notes?: string;             // observação sobre o empenho
}

export interface ProductionOrder {
  id: string;
  opNumber: string;         // ex: "OP-2026-001"
  bioreactorId: string;     // ex: "BIO-100" | "BIO-500" | "BIO-3000" | "BIO-5000"
  prepDate: string;         // "YYYY-MM-DD"
  operatorName: string;     // ex: "Carlos Silva"
  productName: string;      // ex: "Soja", "Premier", "Dual Brady", "Dual Azo", "Dual Force"
  scaleName?: string;       // ex: "100L", "500L", "3000L", "5000L"
  batchVolumeLiters?: number;
  linkedOrder?: LinkedOrderInfo; // Empenho / Vínculo com outra OP
  targetPh?: number;
  targetTemp?: number;
  status: 'em_andamento' | 'concluido' | 'cancelado' | 'pausado';
  notes?: string;
  stages: Record<ProcessStageId, StageRecord>;
  createdAt: string;
  updatedAt: string;
}

export interface CostVarianceSummary {
  standardMin: number;
  realMin: number;
  varianceMin: number;
  variancePercent: number;
}

export interface OrderCostTotals {
  hh: CostVarianceSummary;
  hm: CostVarianceSummary;
  ggf: CostVarianceSummary;
}

export interface OrderTotalMetrics {
  totalRealMin: number;
  totalStandardMin: number;
  totalVarianceMin: number;
  totalVariancePercent: number;
  overallStatus: StageStatus;
  completedStagesCount: number;
  totalStagesCount: number;
  hasBottleneck: boolean;
  criticalStageId?: ProcessStageId;
  criticalVarianceMin: number;
  costTotals?: OrderCostTotals; // Detalhamento consolidado de HH, HM e GGF
}

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  bioreactorId: string;
  productName: string;
  operatorName: string;
  searchQuery: string;
  statusFilter: 'all' | 'delayed' | 'ontime' | 'in_progress' | 'critical';
}

export interface ProductionScale {
  id: string;
  name: string;              // ex: "100L", "500L", "3000L", "5000L"
  volumeLiters: number;      // ex: 100, 500, 3000, 5000
  description?: string;
}

export interface ScaleStandardConfig {
  scaleId: string;
  scaleName: string;         // "100L", "500L", "3000L", "5000L"
  volumeLiters: number;
  stagesStandardMin: Record<string, number>; // { setup: 30, abastecimento: 20, preparo: 40, multiplicacao: 360 }
  setupCostBreakdown?: Record<string, StageCostBreakdown>; // { [stageId]: { hhMin: 20, hmMin: 15, ggfMin: 10 } }
}

export interface ScaleTier {
  id: string;
  name: string;
  minVolumeLiters: number;
  maxVolumeLiters: number;
  stagesStandardMin: Record<string, number>;
  description?: string;
}

export interface ProductPreset {
  id: string;
  code?: string;
  name: string;              // "Soja", "Premier", "Dual Brady", "Dual Azo", "Dual Force"
  description: string;
  volumeLiters?: number;
  targetPh?: number;
  targetTemp?: number;
  scales: ScaleStandardConfig[];
  stagesStandardMin?: Record<string, number>;
  scaleStandards?: ScaleTier[];
}

export interface BioreactorItem {
  id: string;
  code: string;           // ex: "BIO-100", "BIO-500", "BIO-3000", "BIO-5000"
  name: string;           // ex: "Biorreator 5000L"
  capacityLiters: number; // ex: 5000
  scaleName?: string;     // ex: "5000L"
  location?: string;
  status: 'ativo' | 'manutencao' | 'inativo';
  notes?: string;
}

export interface OperatorItem {
  id: string;
  name: string;
  role?: string;
  shift?: string;
  status: 'ativo' | 'inativo';
}

/**
 * Configuração de Tolerâncias e Faixas de Variação para Sinalização de Cores
 * (Verde: Conforme, Amarelo: Atenção, Vermelho: Desvio Crítico)
 */
export interface VarianceThresholdConfig {
  // Limiar de Eficiência (%)
  // Verde (Em conformidade / OK): >= greenMinPercent (ex: 100%)
  // Amarelo (Atenção / Tolerância moderada): >= yellowMinPercent (ex: 85%) até < greenMinPercent
  // Vermelho (Crítico / Desvio): < yellowMinPercent (ex: < 85%)
  greenMinPercent: number;
  yellowMinPercent: number;

  // Tolerância e Limiares em Minutos de Desvio (+minutos de atraso além do Standard)
  // Verde: atraso <= greenMaxDelayMin (ex: 0 min ou 5 min)
  // Amarelo: atraso > greenMaxDelayMin e <= yellowMaxDelayMin (ex: <= 30 min)
  // Vermelho: atraso > yellowMaxDelayMin (ex: > 30 min)
  greenMaxDelayMin: number;
  yellowMaxDelayMin: number;

  // Modo de avaliação:
  // 'percent': avalia pela % de aderência/eficiência (% Standard / Real)
  // 'minutes': avalia pelo desvio absoluto em minutos (+min excedentes)
  // 'hybrid': verde se dentro da tolerância em minutos OU se aderência em % satisfatória
  evaluationMode: 'percent' | 'minutes' | 'hybrid';

  // Descrição/observação personalizada
  description?: string;
}

export const DEFAULT_VARIANCE_THRESHOLDS: VarianceThresholdConfig = {
  greenMinPercent: 100,
  yellowMinPercent: 85,
  greenMaxDelayMin: 0,
  yellowMaxDelayMin: 30,
  evaluationMode: 'percent',
  description: 'Verde: Eficiência ≥ 100% (ou sem atraso); Amarelo: Eficiência entre 85% e 99.9%; Vermelho: Eficiência < 85%.',
};



