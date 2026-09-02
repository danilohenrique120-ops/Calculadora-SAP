import { ProductionOrder, ProductPreset, BioreactorItem, OperatorItem, ProductionScale } from '../types';

export const DEFAULT_PRODUCTION_SCALES: ProductionScale[] = [
  { id: 'scale-100', name: '100L', volumeLiters: 100, description: 'Escala 100 Litros' },
  { id: 'scale-500', name: '500L', volumeLiters: 500, description: 'Escala 500 Litros' },
  { id: 'scale-3000', name: '3000L', volumeLiters: 3000, description: 'Escala 3.000 Litros' },
  { id: 'scale-5000', name: '5000L', volumeLiters: 5000, description: 'Escala 5.000 Litros' },
];

export const PRODUCT_PRESETS: ProductPreset[] = [
  {
    id: 'prod-soja',
    code: 'REC-SOJ-01',
    name: 'Soja',
    description: 'Inoculante biológico para fixação biológica de nitrogênio em cultura de soja.',
    volumeLiters: 5000,
    targetPh: 6.8,
    targetTemp: 30.0,
    scales: [
      {
        scaleId: 'scale-100',
        scaleName: '100L',
        volumeLiters: 100,
        stagesStandardMin: { setup: 30, abastecimento: 20, preparo: 40, inoculacao: 15, multiplicacao: 360 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 3, hmMin: 10, ggfMin: 2 },
        },
      },
      {
        scaleId: 'scale-500',
        scaleName: '500L',
        volumeLiters: 500,
        stagesStandardMin: { setup: 45, abastecimento: 30, preparo: 60, inoculacao: 20, multiplicacao: 480 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 4, hmMin: 14, ggfMin: 2 },
        },
      },
      {
        scaleId: 'scale-3000',
        scaleName: '3000L',
        volumeLiters: 3000,
        stagesStandardMin: { setup: 60, abastecimento: 45, preparo: 90, inoculacao: 30, multiplicacao: 600 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 5, hmMin: 20, ggfMin: 5 },
        },
      },
      {
        scaleId: 'scale-5000',
        scaleName: '5000L',
        volumeLiters: 5000,
        stagesStandardMin: { setup: 75, abastecimento: 60, preparo: 120, inoculacao: 42, multiplicacao: 720 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 5, hmMin: 32, ggfMin: 5 },
        },
      },
    ],
    stagesStandardMin: { setup: 75, abastecimento: 60, preparo: 120, inoculacao: 42, multiplicacao: 720 },
  },
  {
    id: 'prod-premier',
    code: 'REC-PREM-02',
    name: 'Premier',
    description: 'Biofertilizante e promotor de enraizamento celular de alta densidade.',
    volumeLiters: 3000,
    targetPh: 6.5,
    targetTemp: 32.0,
    scales: [
      {
        scaleId: 'scale-100',
        scaleName: '100L',
        volumeLiters: 100,
        stagesStandardMin: { setup: 35, abastecimento: 25, preparo: 45, inoculacao: 15, multiplicacao: 420 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 3, hmMin: 10, ggfMin: 2 },
        },
      },
      {
        scaleId: 'scale-500',
        scaleName: '500L',
        volumeLiters: 500,
        stagesStandardMin: { setup: 50, abastecimento: 35, preparo: 70, inoculacao: 20, multiplicacao: 540 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 4, hmMin: 14, ggfMin: 2 },
        },
      },
      {
        scaleId: 'scale-3000',
        scaleName: '3000L',
        volumeLiters: 3000,
        stagesStandardMin: { setup: 65, abastecimento: 50, preparo: 95, inoculacao: 30, multiplicacao: 720 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 5, hmMin: 20, ggfMin: 5 },
        },
      },
      {
        scaleId: 'scale-5000',
        scaleName: '5000L',
        volumeLiters: 5000,
        stagesStandardMin: { setup: 80, abastecimento: 65, preparo: 130, inoculacao: 42, multiplicacao: 840 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 5, hmMin: 32, ggfMin: 5 },
        },
      },
    ],
    stagesStandardMin: { setup: 65, abastecimento: 50, preparo: 95, inoculacao: 30, multiplicacao: 720 },
  },
  {
    id: 'prod-dual-brady',
    code: 'REC-DBRADY-03',
    name: 'Dual Brady',
    description: 'Consórcio de cepas selecionadas de Bradyrhizobium elkanii e japonicum.',
    volumeLiters: 5000,
    targetPh: 6.9,
    targetTemp: 29.5,
    scales: [
      {
        scaleId: 'scale-100',
        scaleName: '100L',
        volumeLiters: 100,
        stagesStandardMin: { setup: 30, abastecimento: 20, preparo: 50, inoculacao: 15, multiplicacao: 480 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 3, hmMin: 10, ggfMin: 2 },
        },
      },
      {
        scaleId: 'scale-500',
        scaleName: '500L',
        volumeLiters: 500,
        stagesStandardMin: { setup: 45, abastecimento: 30, preparo: 75, inoculacao: 20, multiplicacao: 600 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 4, hmMin: 14, ggfMin: 2 },
        },
      },
      {
        scaleId: 'scale-3000',
        scaleName: '3000L',
        volumeLiters: 3000,
        stagesStandardMin: { setup: 60, abastecimento: 45, preparo: 100, inoculacao: 30, multiplicacao: 780 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 5, hmMin: 20, ggfMin: 5 },
        },
      },
      {
        scaleId: 'scale-5000',
        scaleName: '5000L',
        volumeLiters: 5000,
        stagesStandardMin: { setup: 75, abastecimento: 60, preparo: 135, inoculacao: 42, multiplicacao: 900 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 5, hmMin: 32, ggfMin: 5 },
        },
      },
    ],
    stagesStandardMin: { setup: 75, abastecimento: 60, preparo: 135, inoculacao: 42, multiplicacao: 900 },
  },
  {
    id: 'prod-dual-azo',
    code: 'REC-DAZO-04',
    name: 'Dual Azo',
    description: 'Inoculante para milho, trigo e cana com Azospirillum brasilense.',
    volumeLiters: 3000,
    targetPh: 6.7,
    targetTemp: 31.0,
    scales: [
      {
        scaleId: 'scale-100',
        scaleName: '100L',
        volumeLiters: 100,
        stagesStandardMin: { setup: 25, abastecimento: 20, preparo: 40, inoculacao: 15, multiplicacao: 360 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 3, hmMin: 10, ggfMin: 2 },
        },
      },
      {
        scaleId: 'scale-500',
        scaleName: '500L',
        volumeLiters: 500,
        stagesStandardMin: { setup: 40, abastecimento: 30, preparo: 60, inoculacao: 20, multiplicacao: 480 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 4, hmMin: 14, ggfMin: 2 },
        },
      },
      {
        scaleId: 'scale-3000',
        scaleName: '3000L',
        volumeLiters: 3000,
        stagesStandardMin: { setup: 55, abastecimento: 45, preparo: 85, inoculacao: 30, multiplicacao: 660 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 5, hmMin: 20, ggfMin: 5 },
        },
      },
      {
        scaleId: 'scale-5000',
        scaleName: '5000L',
        volumeLiters: 5000,
        stagesStandardMin: { setup: 70, abastecimento: 55, preparo: 110, inoculacao: 42, multiplicacao: 780 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 5, hmMin: 32, ggfMin: 5 },
        },
      },
    ],
    stagesStandardMin: { setup: 55, abastecimento: 45, preparo: 85, inoculacao: 30, multiplicacao: 660 },
  },
  {
    id: 'prod-dual-force',
    code: 'REC-DFORCE-05',
    name: 'Dual Force',
    description: 'Consórcio bioestimulante duplo de alto rendimento metabólico e viabilidade.',
    volumeLiters: 5000,
    targetPh: 7.0,
    targetTemp: 30.5,
    scales: [
      {
        scaleId: 'scale-100',
        scaleName: '100L',
        volumeLiters: 100,
        stagesStandardMin: { setup: 35, abastecimento: 25, preparo: 50, inoculacao: 15, multiplicacao: 540 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 3, hmMin: 10, ggfMin: 2 },
        },
      },
      {
        scaleId: 'scale-500',
        scaleName: '500L',
        volumeLiters: 500,
        stagesStandardMin: { setup: 50, abastecimento: 40, preparo: 80, inoculacao: 20, multiplicacao: 720 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 4, hmMin: 14, ggfMin: 2 },
        },
      },
      {
        scaleId: 'scale-3000',
        scaleName: '3000L',
        volumeLiters: 3000,
        stagesStandardMin: { setup: 70, abastecimento: 55, preparo: 110, inoculacao: 30, multiplicacao: 960 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 5, hmMin: 20, ggfMin: 5 },
        },
      },
      {
        scaleId: 'scale-5000',
        scaleName: '5000L',
        volumeLiters: 5000,
        stagesStandardMin: { setup: 90, abastecimento: 75, preparo: 140, inoculacao: 42, multiplicacao: 1200 },
        setupCostBreakdown: {
          inoculacao: { hhMin: 5, hmMin: 32, ggfMin: 5 },
        },
      },
    ],
    stagesStandardMin: { setup: 90, abastecimento: 75, preparo: 140, inoculacao: 42, multiplicacao: 1200 },
  },
];

export const INITIAL_BIOREACTORS: BioreactorItem[] = [
  {
    id: 'bio-100',
    code: 'BIO-100',
    name: 'Biorreator 100L (Linha Piloto)',
    capacityLiters: 100,
    scaleName: '100L',
    location: 'Área de Escalonamento - Vaso 1',
    status: 'ativo',
    notes: 'Escala 100L com sensores de pH e OD rápidos.',
  },
  {
    id: 'bio-500',
    code: 'BIO-500',
    name: 'Biorreator 500L (Intermediário)',
    capacityLiters: 500,
    scaleName: '500L',
    location: 'Área de Produção Linha 1',
    status: 'ativo',
    notes: 'Escala 500L para bateladas médias.',
  },
  {
    id: 'bio-3000',
    code: 'BIO-3000',
    name: 'Biorreator 3000L (Produção)',
    capacityLiters: 3000,
    scaleName: '3000L',
    location: 'Área Industrial Linha 2',
    status: 'ativo',
    notes: 'Escala 3000L com agitação Rushton.',
  },
  {
    id: 'bio-5000',
    code: 'BIO-5000',
    name: 'Biorreator 5000L (Master)',
    capacityLiters: 5000,
    scaleName: '5000L',
    location: 'Área Industrial Linha Principal',
    status: 'ativo',
    notes: 'Escala 5000L com alta aeração.',
  },
  {
    id: 'bio-01',
    code: 'BIO-01',
    name: 'Biorreator BIO-01 (5000L)',
    capacityLiters: 5000,
    scaleName: '5000L',
    location: 'Linha A - Vaso Principal',
    status: 'ativo',
    notes: 'Tanque industrial de grande porte.',
  },
  {
    id: 'bio-02',
    code: 'BIO-02',
    name: 'Biorreator BIO-02 (3000L)',
    capacityLiters: 3000,
    scaleName: '3000L',
    location: 'Linha B - Vaso Secundário',
    status: 'ativo',
    notes: 'Biorreator para Soja e Premier.',
  },
];

export const INITIAL_OPERATORS: OperatorItem[] = [
  {
    id: 'op-1',
    name: 'Carlos Silva',
    role: 'Especialista em Bioprocessos Sênior',
    shift: 'Turno 1 (06:00 - 14:00)',
    status: 'ativo',
  },
  {
    id: 'op-2',
    name: 'Fernanda Lima',
    role: 'Operadora de Biorreatores',
    shift: 'Turno 1 (06:00 - 14:00)',
    status: 'ativo',
  },
  {
    id: 'op-3',
    name: 'Roberto Santos',
    role: 'Técnico de Fermentação Pleno',
    shift: 'Turno 2 (14:00 - 22:00)',
    status: 'ativo',
  },
  {
    id: 'op-4',
    name: 'Mariana Costa',
    role: 'Biotecnologista de Produção',
    shift: 'Turno 2 (14:00 - 22:00)',
    status: 'ativo',
  },
  {
    id: 'op-5',
    name: 'Eduardo Vieira',
    role: 'Operador de Formulação',
    shift: 'Turno 3 (22:00 - 06:00)',
    status: 'ativo',
  },
  {
    id: 'op-6',
    name: 'Juliana Mendes',
    role: 'Supervisora de Operações Industriais',
    shift: 'Geral (08:00 - 17:00)',
    status: 'ativo',
  },
];

export const OPERATOR_LIST = INITIAL_OPERATORS.map((o) => o.name);
export const BIOREACTOR_LIST = INITIAL_BIOREACTORS.map((b) => b.code);

export const INITIAL_MOCK_ORDERS: ProductionOrder[] = [
  {
    id: 'ord-001',
    opNumber: 'OP-2026-101',
    bioreactorId: 'BIO-5000',
    prepDate: '2026-08-16',
    operatorName: 'Carlos Silva',
    productName: 'Soja',
    scaleName: '5000L',
    batchVolumeLiters: 5000,
    targetPh: 6.8,
    targetTemp: 30.0,
    status: 'concluido',
    notes: 'Lote de Soja 5000L executado dentro dos padrões de controle.',
    stages: {
      setup: { startTime: '06:00', endTime: '07:10', standardMin: 75 },          // 70m (-5m) -> OK
      abastecimento: { startTime: '07:15', endTime: '08:12', standardMin: 60 },  // 57m (-3m) -> OK
      preparo: { startTime: '08:15', endTime: '10:10', standardMin: 120 },       // 115m (-5m) -> OK
      multiplicacao: { startTime: '10:15', endTime: '22:10', standardMin: 720 }, // 715m (-5m) -> OK
    },
    createdAt: '2026-08-16T06:00:00Z',
    updatedAt: '2026-08-16T22:20:00Z',
  },
  {
    id: 'ord-002',
    opNumber: 'OP-2026-102',
    bioreactorId: 'BIO-3000',
    prepDate: '2026-08-16',
    operatorName: 'Fernanda Lima',
    productName: 'Premier',
    scaleName: '3000L',
    batchVolumeLiters: 3000,
    targetPh: 6.5,
    targetTemp: 32.0,
    status: 'concluido',
    notes: 'Atraso no setup por calibração de válvula de vapor.',
    stages: {
      setup: { startTime: '07:30', endTime: '09:00', standardMin: 65, notes: 'Válvula de vapor oscilando' }, // 90m (+25m, +38%) -> CRITICAL
      abastecimento: { startTime: '09:05', endTime: '10:00', standardMin: 50 }, // 55m (+5m, +10%) -> WARNING
      preparo: { startTime: '10:05', endTime: '11:45', standardMin: 95 },       // 100m (+5m, +5.3%) -> WARNING
      multiplicacao: { startTime: '11:50', endTime: '23:50', standardMin: 720 }, // 720m (0m) -> OK
    },
    createdAt: '2026-08-16T07:30:00Z',
    updatedAt: '2026-08-17T00:00:00Z',
  },
  {
    id: 'ord-003',
    opNumber: 'OP-2026-103',
    bioreactorId: 'BIO-5000',
    prepDate: '2026-08-17',
    operatorName: 'Roberto Santos',
    productName: 'Dual Brady',
    scaleName: '5000L',
    batchVolumeLiters: 5000,
    targetPh: 6.9,
    targetTemp: 29.5,
    status: 'concluido',
    notes: 'Setup rápido. Desvio no abastecimento devido a teste de fluxo.',
    stages: {
      setup: { startTime: '06:00', endTime: '07:12', standardMin: 75 },          // 72m (-3m) -> OK
      abastecimento: { startTime: '07:15', endTime: '08:35', standardMin: 60 },  // 80m (+20m, +33.3%) -> CRITICAL
      preparo: { startTime: '08:40', endTime: '10:50', standardMin: 135 },       // 130m (-5m) -> OK
      multiplicacao: { startTime: '10:55', endTime: '01:55', standardMin: 900 }, // 900m (0m) -> OK (Overnight 15h)
    },
    createdAt: '2026-08-17T06:00:00Z',
    updatedAt: '2026-08-18T02:00:00Z',
  },
  {
    id: 'ord-004',
    opNumber: 'OP-2026-104',
    bioreactorId: 'BIO-3000',
    prepDate: '2026-08-17',
    operatorName: 'Mariana Costa',
    productName: 'Dual Azo',
    scaleName: '3000L',
    batchVolumeLiters: 3000,
    targetPh: 6.7,
    targetTemp: 31.0,
    status: 'concluido',
    notes: 'Batelada modelo. Todos os estágios rigorosamente dentro dos standards.',
    stages: {
      setup: { startTime: '08:00', endTime: '08:52', standardMin: 55 },          // 52m (-3m) -> OK
      abastecimento: { startTime: '08:55', endTime: '09:38', standardMin: 45 },  // 43m (-2m) -> OK
      preparo: { startTime: '09:40', endTime: '11:00', standardMin: 85 },        // 80m (-5m) -> OK
      multiplicacao: { startTime: '11:05', endTime: '22:00', standardMin: 660 }, // 655m (-5m) -> OK
    },
    createdAt: '2026-08-17T08:00:00Z',
    updatedAt: '2026-08-17T22:10:00Z',
  },
  {
    id: 'ord-005',
    opNumber: 'OP-2026-105',
    bioreactorId: 'BIO-500',
    prepDate: '2026-08-17',
    operatorName: 'Eduardo Vieira',
    productName: 'Dual Force',
    scaleName: '500L',
    batchVolumeLiters: 500,
    targetPh: 7.0,
    targetTemp: 30.5,
    status: 'concluido',
    notes: 'Escala 500L com preparo prolongado para calibração de microaeração.',
    stages: {
      setup: { startTime: '14:00', endTime: '14:48', standardMin: 50 },          // 48m (-2m) -> OK
      abastecimento: { startTime: '14:50', endTime: '15:32', standardMin: 40 },  // 42m (+2m, +5%) -> WARNING
      preparo: { startTime: '15:35', endTime: '17:25', standardMin: 80 },        // 110m (+30m, +37.5%) -> CRITICAL
      multiplicacao: { startTime: '17:30', endTime: '05:30', standardMin: 720 }, // 720m (0m) -> OK (Overnight 12h)
    },
    createdAt: '2026-08-17T14:00:00Z',
    updatedAt: '2026-08-18T05:40:00Z',
  },
  {
    id: 'ord-006',
    opNumber: 'OP-2026-106',
    bioreactorId: 'BIO-100',
    prepDate: '2026-08-18',
    operatorName: 'Juliana Mendes',
    productName: 'Soja',
    scaleName: '100L',
    batchVolumeLiters: 100,
    targetPh: 6.8,
    targetTemp: 30.0,
    status: 'em_andamento',
    notes: 'Escala piloto 100L em fase de multiplicação celular.',
    stages: {
      setup: { startTime: '06:00', endTime: '06:28', standardMin: 30 },          // 28m (-2m) -> OK
      abastecimento: { startTime: '06:30', endTime: '06:48', standardMin: 20 },  // 18m (-2m) -> OK
      preparo: { startTime: '06:50', endTime: '07:28', standardMin: 40 },        // 38m (-2m) -> OK
      multiplicacao: { startTime: '07:30', endTime: '', standardMin: 360 },      // Em andamento
    },
    createdAt: '2026-08-18T06:00:00Z',
    updatedAt: '2026-08-18T07:35:00Z',
  },
  {
    id: 'ord-007',
    opNumber: 'OP-2026-107',
    bioreactorId: 'BIO-5000',
    prepDate: '2026-08-18',
    operatorName: 'Carlos Silva',
    productName: 'Premier',
    scaleName: '5000L',
    batchVolumeLiters: 5000,
    linkedOrder: {
      linkedOrderId: 'ord-006',
      linkedOpNumber: 'OP-2026-106',
      relationType: 'inoculo',
      volumeLiters: 100,
      notes: 'Inóculo produzido no BIO-100 (OP-2026-106) empenhado para início da fermentação no vaso principal BIO-5000.',
    },
    targetPh: 6.5,
    targetTemp: 32.0,
    status: 'em_andamento',
    notes: 'Setup e Abastecimento finalizados no BIO-5000 com inóculo do BIO-100. Preparo em andamento.',
    stages: {
      setup: { startTime: '06:00', endTime: '07:15', standardMin: 80 },          // 75m (-5m) -> OK
      abastecimento: { startTime: '07:20', endTime: '08:22', standardMin: 65 },  // 62m (-3m) -> OK
      preparo: { startTime: '08:25', endTime: '', standardMin: 130 },            // Em andamento
      multiplicacao: { startTime: '', endTime: '', standardMin: 840 },
    },
    createdAt: '2026-08-18T06:00:00Z',
    updatedAt: '2026-08-18T08:25:00Z',
  },
];
