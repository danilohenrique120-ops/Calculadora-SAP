import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Clock,
  FlaskConical,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
  Plus,
  Lock,
  Gauge,
  Check,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react';
import {
  ProcessStageId,
  PROCESS_STAGES,
  ProductionOrder,
  ProductPreset,
  StageRecord,
  BioreactorItem,
  OperatorItem,
  LinkedOrderInfo,
  LinkedOrderRelationType,
  CostDriverRule,
  VarianceThresholdConfig,
} from '../types';
import {
  calcStageMetrics,
  calcOrderTotals,
  formatMinutes,
  formatPercent,
  getStatusTheme,
  getProductStandardForScale,
  getProductStandardForBioreactor,
  getMatchingScaleConfig,
  getProductStageCostBreakdown,
} from '../utils/calculations';
import { ErrorBoundary } from './ErrorBoundary';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: ProductionOrder) => void;
  initialOrder?: ProductionOrder | null;
  existingOrders: ProductionOrder[];
  bioreactors?: BioreactorItem[];
  operators?: OperatorItem[];
  products?: ProductPreset[];
  driverRules?: CostDriverRule[];
  varianceThresholds?: VarianceThresholdConfig;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <ErrorBoundary
      fallbackTitle="Erro ao abrir formulário da Ordem"
      fallbackMessage="Ocorreu uma inconsistência ao carregar os dados desta ordem. Clique no botão abaixo para fechar."
      onReset={props.onClose}
    >
      <OrderFormModalInner {...props} />
    </ErrorBoundary>
  );
};

const OrderFormModalInner: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialOrder,
  existingOrders = [],
  bioreactors = [],
  operators = [],
  products = [],
  driverRules = [],
  varianceThresholds,
}) => {
  const availableBioreactors = (Array.isArray(bioreactors) && bioreactors.length > 0)
    ? bioreactors
    : [
        { id: '1', code: 'BIO-100', name: 'Biorreator 100L', capacityLiters: 100, scaleName: '100L', status: 'ativo' as const },
        { id: '2', code: 'BIO-500', name: 'Biorreator 500L', capacityLiters: 500, scaleName: '500L', status: 'ativo' as const },
        { id: '3', code: 'BIO-3000', name: 'Biorreator 3000L', capacityLiters: 3000, scaleName: '3000L', status: 'ativo' as const },
        { id: '4', code: 'BIO-5000', name: 'Biorreator 5000L', capacityLiters: 5000, scaleName: '5000L', status: 'ativo' as const },
      ];

  const availableOperators = (Array.isArray(operators) && operators.length > 0)
    ? operators
    : [
        { id: '1', name: 'Carlos Silva', status: 'ativo' as const },
        { id: '2', name: 'Fernanda Lima', status: 'ativo' as const },
        { id: '3', name: 'Roberto Santos', status: 'ativo' as const },
      ];

  const availableProducts = (Array.isArray(products) && products.length > 0)
    ? products
    : [
        {
          id: 'p1',
          name: 'Soja',
          description: 'Inóculo para cultura de Soja',
          volumeLiters: 5000,
          scales: [
            { scaleId: 'scale-100l', scaleName: '100L', volumeLiters: 100, stagesStandardMin: { setup: 35, abastecimento: 25, preparo: 50, inoculacao: 15, multiplicacao: 500 } },
            { scaleId: 'scale-500l', scaleName: '500L', volumeLiters: 500, stagesStandardMin: { setup: 45, abastecimento: 35, preparo: 70, inoculacao: 20, multiplicacao: 600 } },
            { scaleId: 'scale-3000l', scaleName: '3000L', volumeLiters: 3000, stagesStandardMin: { setup: 60, abastecimento: 45, preparo: 90, inoculacao: 30, multiplicacao: 720 } },
            { scaleId: 'scale-5000l', scaleName: '5000L', volumeLiters: 5000, stagesStandardMin: { setup: 75, abastecimento: 60, preparo: 110, inoculacao: 42, multiplicacao: 750 } },
          ],
          stagesStandardMin: { setup: 60, abastecimento: 45, preparo: 90, inoculacao: 30, multiplicacao: 720 },
        },
      ];

  const defaultBio = availableBioreactors[0]?.code || 'BIO-100';
  const defaultOp = availableOperators[0]?.name || 'Carlos Silva';
  const defaultProd = availableProducts[0]?.name || 'Soja';

  const [opNumber, setOpNumber] = useState('');
  const [bioreactorId, setBioreactorId] = useState(defaultBio);
  const [prepDate, setPrepDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [operatorName, setOperatorName] = useState(defaultOp);
  const [productName, setProductName] = useState(defaultProd);
  const [selectedScale, setSelectedScale] = useState<string>('5000L');
  const [batchVolumeLiters, setBatchVolumeLiters] = useState<number>(5000);
  const [status, setStatus] = useState<'em_andamento' | 'concluido' | 'cancelado'>('em_andamento');
  const [notes, setNotes] = useState('');

  // Linked Order (Empenho / Rastreabilidade entre OPs)
  const [isLinked, setIsLinked] = useState(false);
  const [linkedOrderId, setLinkedOrderId] = useState('');
  const [linkedRelationType, setLinkedRelationType] = useState<LinkedOrderRelationType>('inoculo');
  const [linkedVolumeLiters, setLinkedVolumeLiters] = useState<number | ''>('');
  const [linkedNotes, setLinkedNotes] = useState('');

  const [stages, setStages] = useState<Record<ProcessStageId, StageRecord>>({
    setup: { startTime: '', endTime: '', standardMin: 60 },
    abastecimento: { startTime: '', endTime: '', standardMin: 45 },
    preparo: { startTime: '', endTime: '', standardMin: 90 },
    inoculacao: { startTime: '', endTime: '', standardMin: 30 },
    multiplicacao: { startTime: '', endTime: '', standardMin: 720 },
  });

  const currentMatchedProduct =
    availableProducts.find(
      (p) => p && p.name && p.name.trim().toLowerCase() === (productName || '').trim().toLowerCase()
    ) || availableProducts[0];

  // Available scales for the selected product
  const availableScales = useMemo(() => {
    if (currentMatchedProduct?.scales && Array.isArray(currentMatchedProduct.scales) && currentMatchedProduct.scales.length > 0) {
      return currentMatchedProduct.scales.map((s) => {
        const total = Object.values(s?.stagesStandardMin || {}).reduce<number>(
          (acc, val) => acc + (Number(val) || 0),
          0
        );
        return {
          id: s?.scaleId || s?.scaleName || 'scale-default',
          name: s?.scaleName || '5000L',
          volumeLiters: typeof s?.volumeLiters === 'number' ? s.volumeLiters : 5000,
          standards: s?.stagesStandardMin || {},
          totalStandardMin: total,
        };
      });
    }
    return [
      {
        id: 'scale-100',
        name: '100L',
        volumeLiters: 100,
        standards: { setup: 30, abastecimento: 20, preparo: 40, inoculacao: 15, multiplicacao: 360 },
        totalStandardMin: 465,
      },
      {
        id: 'scale-500',
        name: '500L',
        volumeLiters: 500,
        standards: { setup: 45, abastecimento: 30, preparo: 60, inoculacao: 20, multiplicacao: 480 },
        totalStandardMin: 635,
      },
      {
        id: 'scale-3000',
        name: '3000L',
        volumeLiters: 3000,
        standards: { setup: 60, abastecimento: 45, preparo: 90, inoculacao: 30, multiplicacao: 600 },
        totalStandardMin: 825,
      },
      {
        id: 'scale-5000',
        name: '5000L',
        volumeLiters: 5000,
        standards: { setup: 75, abastecimento: 60, preparo: 120, inoculacao: 42, multiplicacao: 720 },
        totalStandardMin: 1017,
      },
    ];
  }, [currentMatchedProduct]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialOrder) {
      setOpNumber(initialOrder.opNumber || '');
      setBioreactorId(initialOrder.bioreactorId || defaultBio);
      setPrepDate(initialOrder.prepDate || new Date().toISOString().split('T')[0]);
      setOperatorName(initialOrder.operatorName || defaultOp);
      setProductName(initialOrder.productName || defaultProd);

      // Determine initial scale
      const orderScale = initialOrder.scaleName || (initialOrder.batchVolumeLiters ? `${initialOrder.batchVolumeLiters}L` : '5000L');
      setSelectedScale(orderScale);
      setBatchVolumeLiters(initialOrder.batchVolumeLiters || 5000);

      setStatus(
        initialOrder.status === 'cancelado'
          ? 'cancelado'
          : initialOrder.status === 'concluido'
          ? 'concluido'
          : 'em_andamento'
      );
      setNotes(initialOrder.notes || '');

      // Load and normalize stages with standards
      const loadedStages = JSON.parse(JSON.stringify(initialOrder.stages || {}));
      const currentProd = availableProducts.find((p) => p && p.name === initialOrder.productName) || availableProducts[0];
      const prodStds = getProductStandardForScale(currentProd, orderScale, PROCESS_STAGES);

      PROCESS_STAGES.forEach((st) => {
        const existing = loadedStages[st.id] || { startTime: '', endTime: '' };
        const stdMin = existing.standardMin || prodStds[st.id] || st.defaultStandardMin;
        const breakdown =
          existing.setupCostBreakdown &&
          (existing.setupCostBreakdown.hhMin > 0 ||
            existing.setupCostBreakdown.hmMin > 0 ||
            existing.setupCostBreakdown.ggfMin > 0)
            ? existing.setupCostBreakdown
            : getProductStageCostBreakdown(currentProd, orderScale, st.id, stdMin);

        loadedStages[st.id] = {
          ...existing,
          standardMin: stdMin,
          setupCostBreakdown: breakdown,
        };
      });

      setStages(loadedStages);

      // Linked Order load
      if (initialOrder.linkedOrder && initialOrder.linkedOrder.linkedOpNumber) {
        setIsLinked(true);
        setLinkedOrderId(initialOrder.linkedOrder.linkedOrderId || initialOrder.linkedOrder.linkedOpNumber);
        setLinkedRelationType(initialOrder.linkedOrder.relationType || 'inoculo');
        setLinkedVolumeLiters(initialOrder.linkedOrder.volumeLiters ?? '');
        setLinkedNotes(initialOrder.linkedOrder.notes || '');
      } else {
        setIsLinked(false);
        setLinkedOrderId('');
        setLinkedRelationType('inoculo');
        setLinkedVolumeLiters('');
        setLinkedNotes('');
      }
    } else {
      // Auto-generate next OP number
      const safeOrders = Array.isArray(existingOrders) ? existingOrders : [];
      const nextNum = safeOrders.length + 1;
      const year = new Date().getFullYear();
      setOpNumber(`OP-${year}-${String(nextNum).padStart(3, '0')}`);
      setPrepDate(new Date().toISOString().split('T')[0]);
      
      const defBio = availableBioreactors[0]?.code || 'BIO-5000';
      const bioObj = availableBioreactors.find((b) => b && b.code === defBio);
      const defOp = availableOperators[0]?.name || 'Carlos Silva';
      const defProd = availableProducts[0];

      const initialScale = bioObj?.scaleName || (bioObj?.capacityLiters ? `${bioObj.capacityLiters}L` : '5000L');
      const initialVol = bioObj?.capacityLiters || 5000;

      setBioreactorId(defBio);
      setOperatorName(defOp);
      setProductName(defProd?.name || 'Soja');
      setSelectedScale(initialScale);
      setBatchVolumeLiters(initialVol);
      setStatus('em_andamento');
      setNotes('');
      setIsLinked(false);
      setLinkedOrderId('');
      setLinkedRelationType('inoculo');
      setLinkedVolumeLiters('');
      setLinkedNotes('');

      // Pull standards directly configured for this product and scale
      if (defProd) {
        const stds = getProductStandardForScale(defProd, initialScale, PROCESS_STAGES);
        const newStages: Record<ProcessStageId, StageRecord> = {} as Record<ProcessStageId, StageRecord>;
        PROCESS_STAGES.forEach((st) => {
          const stdMin = stds[st.id] ?? st.defaultStandardMin;
          newStages[st.id] = {
            startTime: '',
            endTime: '',
            standardMin: stdMin,
            setupCostBreakdown: getProductStageCostBreakdown(defProd, initialScale, st.id, stdMin),
          };
        });
        setStages(newStages);
      }
    }
  }, [initialOrder, isOpen, existingOrders]);

  const currentScaleConfig = getMatchingScaleConfig(currentMatchedProduct, selectedScale);

  /**
   * Applies the exact standard times and setup cost breakdowns from the Standards screen for a product & scale
   */
  const handleScaleSelect = (scaleName: string, volLiters?: number) => {
    setSelectedScale(scaleName);
    const matchedScale = availableScales.find((s) => {
      const sName = (s.name || '').toLowerCase();
      const sId = (s.id || '').toLowerCase();
      const target = (scaleName || '').toLowerCase();
      return (sName !== '' && sName === target) || (sId !== '' && sId === target);
    });
    const parsedVol = parseInt(String(scaleName).replace(/\D/g, ''), 10);
    const vol = volLiters ?? matchedScale?.volumeLiters ?? (isNaN(parsedVol) ? 5000 : parsedVol);
    setBatchVolumeLiters(vol);

    const prod = availableProducts.find((p) => p && p.name === productName) || availableProducts[0];
    const stds = getProductStandardForScale(prod, scaleName, PROCESS_STAGES);
    setStages((prev) => {
      const next: Record<ProcessStageId, StageRecord> = { ...prev };
      PROCESS_STAGES.forEach((st) => {
        const stdMin = stds[st.id] ?? st.defaultStandardMin;
        next[st.id] = {
          ...(prev[st.id] || { startTime: '', endTime: '' }),
          standardMin: stdMin,
          setupCostBreakdown: getProductStageCostBreakdown(prod, scaleName, st.id, stdMin),
        };
      });
      return next;
    });
  };

  const handleBioreactorChange = (newBioCode: string) => {
    setBioreactorId(newBioCode);
    const bio = availableBioreactors.find((b) => b && b.code === newBioCode);
    if (bio) {
      const targetScale = bio.scaleName || (bio.capacityLiters ? `${bio.capacityLiters}L` : selectedScale);
      handleScaleSelect(targetScale, bio.capacityLiters);
    }
  };

  const handleProductSelect = (selectedName: string) => {
    setProductName(selectedName);
    const prod = availableProducts.find((p) => p && p.name === selectedName);
    if (prod) {
      const stds = getProductStandardForScale(prod, selectedScale, PROCESS_STAGES);
      setStages((prev) => {
        const next: Record<ProcessStageId, StageRecord> = { ...prev };
        PROCESS_STAGES.forEach((st) => {
          const stdMin = stds[st.id] ?? st.defaultStandardMin;
          next[st.id] = {
            ...(prev[st.id] || { startTime: '', endTime: '' }),
            standardMin: stdMin,
            setupCostBreakdown: getProductStageCostBreakdown(prod, selectedScale, st.id, stdMin),
          };
        });
        return next;
      });
    }
  };

  const updateStage = (stageId: ProcessStageId, updates: Partial<StageRecord>) => {
    setStages((prev) => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        ...updates,
      },
    }));
  };

  const stampNow = (stageId: ProcessStageId, type: 'start' | 'end') => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (type === 'start') {
      updateStage(stageId, {
        startDate: dateStr,
        startTime: timeStr,
      });
    } else {
      updateStage(stageId, {
        endDate: dateStr,
        endTime: timeStr,
      });
    }
  };

  // Set of OP IDs/Numbers that are already committed (empenhadas) elsewhere in the system
  const availableForEmpenhoOrders = useMemo(() => {
    const safeOrders = Array.isArray(existingOrders) ? existingOrders : [];
    const empenhadasIdsSet = new Set<string>();

    safeOrders.forEach((order) => {
      if (!order) return;
      // Ignore the current order being edited
      if (initialOrder?.id && order.id === initialOrder.id) return;

      // If this order has a linkedOrder configured
      if (order.linkedOrder && order.linkedOrder.linkedOpNumber) {
        if (order.linkedOrder.linkedOrderId) {
          empenhadasIdsSet.add(order.linkedOrder.linkedOrderId);
        }
        if (order.linkedOrder.linkedOpNumber) {
          empenhadasIdsSet.add(order.linkedOrder.linkedOpNumber);
        }
        // The child order itself is also committed
        if (order.id) empenhadasIdsSet.add(order.id);
        if (order.opNumber) empenhadasIdsSet.add(order.opNumber);
      }
    });

    return safeOrders.filter((o) => {
      if (!o) return false;
      // Cannot link to itself
      if ((initialOrder?.id && o.id === initialOrder.id) || (initialOrder?.opNumber && o.opNumber === initialOrder.opNumber)) {
        return false;
      }
      // If it is the currently selected OP in this form session, keep it available so it doesn't disappear when opening edit
      if (linkedOrderId && (o.id === linkedOrderId || o.opNumber === linkedOrderId)) {
        return true;
      }
      // Otherwise, only include if NOT in the empenhadas set
      const isAlreadyEmpenhada = (o.id && empenhadasIdsSet.has(o.id)) || (o.opNumber && empenhadasIdsSet.has(o.opNumber));
      return !isAlreadyEmpenhada;
    });
  }, [existingOrders, initialOrder?.id, initialOrder?.opNumber, linkedOrderId]);

  // Build Linked Order Object
  const linkedOrderPayload: LinkedOrderInfo | undefined = isLinked && linkedOrderId ? {
    linkedOrderId,
    linkedOpNumber: (existingOrders || []).find((o) => o && (o.id === linkedOrderId || o.opNumber === linkedOrderId))?.opNumber || linkedOrderId,
    relationType: linkedRelationType,
    volumeLiters: linkedVolumeLiters !== '' ? Number(linkedVolumeLiters) : undefined,
    notes: linkedNotes.trim() || undefined,
  } : undefined;

  // Preview synthetic order
  const previewOrder: ProductionOrder = {
    id: initialOrder?.id || 'temp',
    opNumber,
    bioreactorId,
    prepDate,
    operatorName,
    productName,
    scaleName: selectedScale,
    batchVolumeLiters,
    linkedOrder: linkedOrderPayload,
    status,
    notes,
    stages,
    createdAt: initialOrder?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const totals = useMemo(() => {
    try {
      return calcOrderTotals(previewOrder, driverRules, varianceThresholds);
    } catch (err) {
      console.error('Error in calcOrderTotals:', err);
      return {
        totalRealMin: 0,
        totalStandardMin: 0,
        totalVarianceMin: 0,
        totalVariancePercent: 0,
        overallStatus: 'pending' as const,
        completedStagesCount: 0,
        totalStagesCount: 5,
        hasBottleneck: false,
        criticalVarianceMin: 0,
      };
    }
  }, [previewOrder, driverRules, varianceThresholds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opNumber.trim()) return;

    const orderToSave: ProductionOrder = {
      id: initialOrder?.id || `ord-${Date.now()}`,
      opNumber: opNumber.trim(),
      bioreactorId,
      prepDate,
      operatorName,
      productName,
      scaleName: selectedScale,
      batchVolumeLiters,
      linkedOrder: linkedOrderPayload,
      status,
      notes: notes.trim(),
      stages,
      createdAt: initialOrder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(orderToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{initialOrder ? `Editar Ordem ${initialOrder.opNumber}` : 'Nova Ordem de Produção (OP)'}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                  {selectedScale}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Lançamento de horários, cálculo automático de tempos e direcionadores HH, HM e GGF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-200">
          {/* Section 1: Header / Batch Info */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              1. Identificação da Batelada & Equipamentos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* OP Number */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Número da OP <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={opNumber}
                  onChange={(e) => setOpNumber(e.target.value)}
                  placeholder="ex: OP-2026-001"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Prep Date */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Data de Preparo <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={prepDate}
                    onChange={(e) => setPrepDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Bioreactor */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Biorreator <span className="text-rose-400">*</span>
                </label>
                <select
                  value={bioreactorId}
                  onChange={(e) => handleBioreactorChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                >
                  {availableBioreactors.map((bio) => (
                    <option key={bio.id || bio.code} value={bio.code}>
                      {bio.code} - {bio.name} ({bio.capacityLiters}L)
                    </option>
                  ))}
                </select>
              </div>

              {/* Operator */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operador Responsável <span className="text-rose-400">*</span>
                </label>
                <select
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  {availableOperators.map((op) => (
                    <option key={op.id || op.name} value={op.name}>
                      {op.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Produto / Inóculo <span className="text-rose-400">*</span>
                </label>
                <select
                  value={productName}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  {availableProducts.map((p) => (
                    <option key={p.id || p.name} value={p.name}>
                      {p.name} {p.description ? `(${p.description})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Status da Ordem
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'em_andamento' | 'concluido' | 'cancelado')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-medium"
                >
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              {/* Target Volume */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Volume Útil da Batelada (L)
                </label>
                <input
                  type="number"
                  value={batchVolumeLiters}
                  onChange={(e) => setBatchVolumeLiters(Number(e.target.value) || 0)}
                  placeholder="5000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Scale Selector Chips (Rule 2: Dynamic Standards by Scale) */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    Escala de Produção da Batelada <span className="text-rose-400">*</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Selecione a escala para carregar automaticamente os tempos standards configurados para este produto.
                  </p>
                </div>
                
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 flex items-center gap-1">
                  <Check className="w-3 h-3 text-cyan-400" />
                  Escala Ativa: <strong>{selectedScale}</strong> ({batchVolumeLiters} L)
                </span>
              </div>

              {/* Interactive Scale Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {availableScales.map((scale) => {
                  const scaleNameStr = (scale.name || '').toLowerCase();
                  const scaleIdStr = (scale.id || '').toLowerCase();
                  const selectedStr = (selectedScale || '').toLowerCase();
                  const isSelected =
                    (scaleNameStr !== '' && selectedStr === scaleNameStr) ||
                    (scaleIdStr !== '' && selectedStr === scaleIdStr);

                  return (
                    <button
                      key={scale.id || scale.name}
                      type="button"
                      onClick={() => handleScaleSelect(scale.name, scale.volumeLiters)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border-cyan-500 ring-2 ring-cyan-500/40 text-white shadow-lg shadow-cyan-950/50'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                          <span>{scale.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {scale.volumeLiters} Litros
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-500'
                        }`}
                      >
                        {scale.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Linked / Committed Order (Empenho de OP) */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <LinkIcon className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Empenho / Vínculo entre Ordens (Rastreabilidade)
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Vincule esta OP a uma batelada anterior (ex: inóculo preparado em outro biorreator ou lote semente).
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLinked}
                      onChange={(e) => {
                        setIsLinked(e.target.checked);
                        if (e.target.checked && !linkedOrderId && availableForEmpenhoOrders.length > 0) {
                          setLinkedOrderId(availableForEmpenhoOrders[0]?.id || '');
                        } else if (!e.target.checked) {
                          setLinkedOrderId('');
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    <span className="ml-2 text-xs font-medium text-slate-300">
                      {isLinked ? 'Empenhado' : 'Sem vínculo'}
                    </span>
                  </label>
                </div>

                {isLinked && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/70 animate-in fade-in duration-150">
                    {/* Select Parent/Target OP */}
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Ordem Vinculada (OP Mãe / Origem) <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={linkedOrderId}
                        onChange={(e) => setLinkedOrderId(e.target.value)}
                        className="w-full bg-slate-900 border border-cyan-800/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      >
                        <option value="">
                          {availableForEmpenhoOrders.length === 0 ? '-- Nenhuma OP disponível --' : '-- Selecione uma OP --'}
                        </option>
                        {availableForEmpenhoOrders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.opNumber} - {o.productName} ({o.bioreactorId} - {o.scaleName || `${o.batchVolumeLiters}L`})
                          </option>
                        ))}
                      </select>
                      {availableForEmpenhoOrders.length === 0 && (
                        <p className="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1 font-mono">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          Todas as demais OPs já foram empenhadas.
                        </p>
                      )}
                    </div>

                    {/* Relation Type */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Tipo de Relação / Empenho
                      </label>
                      <select
                        value={linkedRelationType}
                        onChange={(e) => setLinkedRelationType(e.target.value as LinkedOrderRelationType)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="inoculo">Inóculo / Batelada Mãe (Semente)</option>
                        <option value="transferencia">Transferência de Volume</option>
                        <option value="empenho">Empenho de Ordem / Sub-lote</option>
                        <option value="filha">Etapa Subsequente (OP Filha)</option>
                      </select>
                    </div>

                    {/* Volume empenhado */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Volume Empenhado / Inoculado (L)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={linkedVolumeLiters}
                        onChange={(e) => setLinkedVolumeLiters(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="ex: 100"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Notes for the link */}
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={linkedNotes}
                        onChange={(e) => setLinkedNotes(e.target.value)}
                        placeholder="Observações do empenho (ex: Inóculo de BIO-100 transferido em fase exponencial para vaso principal)"
                        className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Live Variations Breakdown of Selected Parent Order */}
                    {(() => {
                      const selectedParent = (existingOrders || []).find((o) => o && (o.id === linkedOrderId || o.opNumber === linkedOrderId));
                      if (!selectedParent) return null;
                      const pTotals = calcOrderTotals(selectedParent, driverRules, varianceThresholds);
                      const pTheme = getStatusTheme(pTotals.overallStatus);

                      return (
                        <div className="sm:col-span-3 p-3 bg-slate-950/90 rounded-lg border border-cyan-900/70 space-y-2 mt-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                                <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                                Variações da OP Mãe ({selectedParent.opNumber})
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                                {selectedParent.productName} • {selectedParent.bioreactorId} • {selectedParent.scaleName || `${selectedParent.batchVolumeLiters}L`}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] font-mono">
                              <span className="text-slate-400 text-[10px]">Desvio Consolidado:</span>
                              <span className={`font-bold ${pTheme.text}`}>
                                {pTotals.totalVarianceMin > 0 ? `+${pTotals.totalVarianceMin}m` : `${pTotals.totalVarianceMin}m`} ({formatPercent(pTotals.totalVariancePercent)})
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pTheme.badge}`}>
                                {pTheme.label}
                              </span>
                            </div>
                          </div>

                          {/* Stage variations cards for parent */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                            {PROCESS_STAGES.map((s) => {
                              const st = selectedParent.stages ? selectedParent.stages[s.id] : undefined;
                              const m = calcStageMetrics(
                                st,
                                selectedParent.prepDate,
                                s.id,
                                driverRules,
                                {
                                  scaleName: selectedParent.scaleName,
                                  bioreactorId: selectedParent.bioreactorId,
                                  allStages: selectedParent.stages,
                                  productName: selectedParent.productName,
                                },
                                varianceThresholds
                              );
                              const t = getStatusTheme(m.status);
                              return (
                                <div
                                  key={s.id}
                                  className={`p-2 rounded border text-[11px] font-mono ${
                                    m.isFilled ? `${t.bg} ${t.border}` : 'bg-slate-900/50 border-slate-800/80 text-slate-500'
                                  }`}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-slate-300">{s.shortLabel}</span>
                                    {m.isFilled ? (
                                      <span className={`font-bold ${t.text}`}>
                                        {m.varianceMin > 0 ? `+${m.varianceMin}m` : `${m.varianceMin}m`}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-slate-500">Pendente</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex justify-between">
                                    <span>Std: {st?.standardMin || s.defaultStandardMin}m</span>
                                    <span className="text-white font-semibold">Real: {m.isFilled ? `${m.durationMin}m` : '--'}</span>
                                  </div>
                                  {m.isFilled && (
                                    <div className="text-[10px] flex justify-between items-center pt-1 border-t border-white/5 mt-1">
                                      <span className="text-slate-500">Eficiência:</span>
                                      <span className={`font-bold ${t.text}`}>{m.variancePercent.toFixed(1)}%</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Process Stages */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                2. Apontamento das Etapas do Processo
              </h3>
              
              <div className="flex items-center space-x-2">
                {currentScaleConfig && (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-[10px] font-mono">
                    <span>Escala: {currentScaleConfig.scaleName} ({currentScaleConfig.volumeLiters}L)</span>
                  </span>
                )}
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-mono">
                  <Lock className="w-2.5 h-2.5 text-slate-500" />
                  <span>Standards Bloqueados da Engenharia</span>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {PROCESS_STAGES.map((stageDef) => {
                const stageData = stages[stageDef.id] || { startTime: '', endTime: '', standardMin: stageDef.defaultStandardMin };
                const metrics = calcStageMetrics(
                  stageData,
                  prepDate,
                  stageDef.id,
                  driverRules,
                  {
                    scaleName: currentScaleConfig?.scaleName,
                    bioreactorId,
                    allStages: stages,
                    productName: productName,
                  },
                  varianceThresholds
                );
                const theme = getStatusTheme(metrics.status);

                return (
                  <div
                    key={stageDef.id}
                    className="p-3.5 rounded-xl border bg-slate-900/90 border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Left: Stage Title and Info */}
                      <div className="lg:w-1/3">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0">
                            {stageDef.sequence}
                          </span>
                          <span className="font-bold text-xs text-white">
                            {stageDef.label}
                          </span>
                          {stageDef.id === 'abastecimento' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                              Unificado com Preparo
                            </span>
                          )}
                          {stageDef.id === 'preparo' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-mono">
                              Unificado com Abastecimento
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 ml-7">
                          {stageDef.description}
                        </p>
                      </div>

                      {/* Middle: Inputs (Start Date/Time, End Date/Time, Standard) */}
                      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 lg:w-6/12">
                        {/* Start Date & Time */}
                        <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                          <span className="text-[9px] font-mono text-slate-500 uppercase px-1">Início:</span>
                          <input
                            type="date"
                            value={stageData.startDate || prepDate || ''}
                            onChange={(e) => updateStage(stageDef.id, { startDate: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                            title="Data de Início da Etapa"
                          />
                          <input
                            type="time"
                            value={stageData.startTime || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateStage(stageDef.id, {
                                startTime: val,
                                startDate: stageData.startDate || prepDate || new Date().toISOString().split('T')[0],
                              });
                            }}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                            title="Hora de Início da Etapa"
                          />
                          <button
                            type="button"
                            onClick={() => stampNow(stageDef.id, 'start')}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[10px] font-mono font-semibold cursor-pointer"
                            title="Preencher data e hora atual"
                          >
                            Agora
                          </button>
                        </div>

                        <span className="text-slate-500 text-xs hidden sm:inline">→</span>

                        {/* End Date & Time */}
                        <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                          <span className="text-[9px] font-mono text-slate-500 uppercase px-1">Fim:</span>
                          <input
                            type="date"
                            value={stageData.endDate || stageData.startDate || prepDate || ''}
                            onChange={(e) => updateStage(stageDef.id, { endDate: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                            title="Data de Término da Etapa"
                          />
                          <input
                            type="time"
                            value={stageData.endTime || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateStage(stageDef.id, {
                                endTime: val,
                                endDate: stageData.endDate || stageData.startDate || prepDate || new Date().toISOString().split('T')[0],
                              });
                            }}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                            title="Hora de Término da Etapa"
                          />
                          <button
                            type="button"
                            onClick={() => stampNow(stageDef.id, 'end')}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[10px] font-mono font-semibold cursor-pointer"
                            title="Preencher data e hora atual"
                          >
                            Agora
                          </button>
                        </div>
                      </div>

                      {/* Right: Calculated Metrics Badge */}
                      <div className="lg:w-3/12 flex items-center justify-end space-x-2">
                        {metrics.isFilled ? (
                          <div className={`px-3 py-1.5 rounded-lg border text-xs flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 ${theme.bg} ${theme.border} ${theme.text}`}>
                            <span className="font-mono-num font-bold">
                              {metrics.durationMin}m ({formatMinutes(metrics.durationMin)})
                            </span>
                            <span className="font-mono text-[11px] font-bold">
                              {formatPercent(metrics.variancePercent)}
                            </span>
                            {metrics.isMultiDay && (
                              <span className="text-[9px] px-1 py-0.2 bg-blue-500/20 text-blue-300 rounded font-mono font-bold">
                                {metrics.daysCount > 0 ? `+${metrics.daysCount}d` : 'virada'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Aguardando apontamento</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Observações & Totais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Observações Operacionais & Justificativas de Desvios
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ex: Oscilação de vapor na linha durante a esterilização; atraso na colheita por análise microbiológica..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Overall Summary Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Resumo da Batelada & Variações Totais
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tempo Total Real:</span>
                  <span className="font-mono-num font-bold text-white">
                    {totals.totalRealMin} min ({formatMinutes(totals.totalRealMin)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tempo Total Standard:</span>
                  <span className="font-mono-num text-cyan-400">
                    {totals.totalStandardMin} min
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1">
                  <span className="text-slate-400">Variação Total da Ordem:</span>
                  <span
                    className={`font-mono-num font-bold ${
                      totals.totalVarianceMin > 0
                        ? totals.totalVariancePercent < 85
                          ? 'text-rose-400'
                          : 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {totals.totalVarianceMin > 0 ? `+${totals.totalVarianceMin}m` : `${totals.totalVarianceMin}m`}{' '}
                    ({formatPercent(totals.totalVariancePercent)})
                  </span>
                </div>

                {/* Variações Totais por Direcionador de Custo (HH, HM, GGF) */}
                {totals.costTotals && totals.completedStagesCount > 0 && (
                  <div className="pt-2 mt-1 border-t border-slate-800/80 space-y-1.5">
                    <div className="text-[10px] uppercase font-mono font-bold text-slate-400">
                      Variação Total por Direcionador:
                    </div>

                    {/* HH */}
                    <div className="flex items-center justify-between text-[11px] font-mono bg-blue-950/30 p-1.5 rounded border border-blue-900/30">
                      <span className="text-blue-300 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        Hora Homem (HH):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">
                          {totals.costTotals.hh.realMin}m <span className="text-slate-500">/ {totals.costTotals.hh.standardMin}m</span>
                        </span>
                        <span className={`font-bold ${totals.costTotals.hh.varianceMin > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {totals.costTotals.hh.varianceMin > 0 ? `+${totals.costTotals.hh.varianceMin}m` : `${totals.costTotals.hh.varianceMin}m`}{' '}
                          ({formatPercent(totals.costTotals.hh.variancePercent)})
                        </span>
                      </div>
                    </div>

                    {/* HM */}
                    <div className="flex items-center justify-between text-[11px] font-mono bg-amber-950/30 p-1.5 rounded border border-amber-900/30">
                      <span className="text-amber-300 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Hora Máquina (HM):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">
                          {totals.costTotals.hm.realMin}m <span className="text-slate-500">/ {totals.costTotals.hm.standardMin}m</span>
                        </span>
                        <span className={`font-bold ${totals.costTotals.hm.varianceMin > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {totals.costTotals.hm.varianceMin > 0 ? `+${totals.costTotals.hm.varianceMin}m` : `${totals.costTotals.hm.varianceMin}m`}{' '}
                          ({formatPercent(totals.costTotals.hm.variancePercent)})
                        </span>
                      </div>
                    </div>

                    {/* GGF */}
                    <div className="flex items-center justify-between text-[11px] font-mono bg-purple-950/30 p-1.5 rounded border border-purple-900/30">
                      <span className="text-purple-300 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        GGF:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">
                          {totals.costTotals.ggf.realMin}m <span className="text-slate-500">/ {totals.costTotals.ggf.standardMin}m</span>
                        </span>
                        <span className={`font-bold ${totals.costTotals.ggf.varianceMin > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {totals.costTotals.ggf.varianceMin > 0 ? `+${totals.costTotals.ggf.varianceMin}m` : `${totals.costTotals.ggf.varianceMin}m`}{' '}
                          ({formatPercent(totals.costTotals.ggf.variancePercent)})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-cyan-500/25 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{initialOrder ? 'Salvar Alterações da OP' : 'Criar Ordem de Produção'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
