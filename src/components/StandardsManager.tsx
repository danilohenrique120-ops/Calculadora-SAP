import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Clock,
  Save,
  CheckCircle2,
  FlaskConical,
  RotateCcw,
  Plus,
  Trash2,
  Layers,
  Edit2,
  Lock,
  Search,
  Check,
  X,
  Gauge,
  Info,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Copy,
  Table,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ProductPreset,
  BioreactorItem,
  ProductionScale,
  StageDefinition,
  PROCESS_STAGES,
  ScaleStandardConfig,
  StageCostBreakdown,
  ProcessStageId,
  CostDriverRule,
  DEFAULT_COST_DRIVER_RULES,
  StageDriverRuleConfig,
  DriverCalculationMode,
} from '../types';
import { DEFAULT_PRODUCTION_SCALES, PRODUCT_PRESETS } from '../utils/mockData';
import {
  formatMinutes,
  ensureAllProductScales,
  normalizeProductPresets,
  getDefaultStageCostBreakdown,
  getStoredCostDriverRules,
  saveStoredCostDriverRules,
} from '../utils/calculations';
import { ConfirmModal } from './ConfirmModal';

interface StandardsManagerProps {
  presets: ProductPreset[];
  onUpdatePresets: (presets: ProductPreset[]) => void;
  bioreactors?: BioreactorItem[];
  onLockAdmin?: () => void;
}

export const StandardsManager: React.FC<StandardsManagerProps> = ({
  presets,
  onUpdatePresets,
  bioreactors = [],
  onLockAdmin,
}) => {
  const [localPresets, setLocalPresets] = useState<ProductPreset[]>(() =>
    normalizeProductPresets(presets)
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    presets[0]?.id || 'prod-soja'
  );
  const [productToDelete, setProductToDelete] = useState<ProductPreset | null>(null);
  const [productDeleteAlert, setProductDeleteAlert] = useState<string | null>(null);
  const [activeScaleTab, setActiveScaleTab] = useState<string>('100L');
  const [viewLayout, setViewLayout] = useState<'matrix' | 'by_scale'>('matrix');
  const [searchFilter, setSearchFilter] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Dynamic scales and stages list
  const [customScales, setCustomScales] = useState<ProductionScale[]>(DEFAULT_PRODUCTION_SCALES);
  const [customStages, setCustomStages] = useState<StageDefinition[]>(PROCESS_STAGES);

  // Modal for New Product
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');

  // Modal for Edit Product
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editProdName, setEditProdName] = useState('');
  const [editProdCode, setEditProdCode] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');

  // Modal for New Scale
  const [isNewScaleModalOpen, setIsNewScaleModalOpen] = useState(false);
  const [newScaleName, setNewScaleName] = useState('');
  const [newScaleVolume, setNewScaleVolume] = useState<number>(10000);

  // Modal for New Stage
  const [isNewStageModalOpen, setIsNewStageModalOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageDefaultMin, setNewStageDefaultMin] = useState<number>(60);
  const [newStageDesc, setNewStageDesc] = useState('');

  // Synchronize when presets prop updates, always keeping scales normalized
  useEffect(() => {
    setLocalPresets(normalizeProductPresets(presets, customScales));
  }, [presets, customScales]);

  const currentPreset =
    localPresets.find((p) => p.id === selectedPresetId) || localPresets[0] || PRODUCT_PRESETS[0];

  // Available scales in current preset - ALWAYS ensures all custom scales (100L, 500L, 3000L, 5000L, etc.) are present
  const presetScales = React.useMemo(() => {
    return ensureAllProductScales(currentPreset, customScales);
  }, [currentPreset, customScales]);

  // Ensure activeScaleTab is valid
  useEffect(() => {
    if (presetScales.length > 0 && !presetScales.some((s) => s.scaleName.toLowerCase() === activeScaleTab.toLowerCase())) {
      setActiveScaleTab(presetScales[0].scaleName);
    }
  }, [selectedPresetId, presetScales, activeScaleTab]);

  // Filtered product presets for selector
  const filteredPresets = localPresets.filter((p) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  // Handler to update standard minutes for a specific scale & stage in the current product
  const handleUpdateStandardMin = (scaleName: string, stageId: string, newMin: number) => {
    const validMin = Math.max(1, Math.round(newMin));

    setLocalPresets((prev) => {
      const updated = prev.map((prod) => {
        if (prod.id !== currentPreset.id) return prod;

        // Ensure all scales are preserved so columns never collapse
        const allScales = ensureAllProductScales(prod, customScales);
        const updatedScales = allScales.map((s) => {
          if (
            s.scaleName.toLowerCase() === scaleName.toLowerCase() ||
            s.scaleId.toLowerCase() === scaleName.toLowerCase() ||
            s.scaleName.toLowerCase().replace(/[^0-9a-z]/g, '') === scaleName.toLowerCase().replace(/[^0-9a-z]/g, '')
          ) {
            // If total changes, auto-scale HH/HM/GGF proportionally if not explicitly set
            const currentBreakdown = s.setupCostBreakdown?.[stageId];
            const updatedBreakdown = currentBreakdown
              ? currentBreakdown
              : getDefaultStageCostBreakdown(validMin);

            return {
              ...s,
              stagesStandardMin: {
                ...s.stagesStandardMin,
                [stageId]: validMin,
              },
              setupCostBreakdown: {
                ...(s.setupCostBreakdown || {}),
                [stageId]: updatedBreakdown,
              },
            };
          }
          return s;
        });

        return {
          ...prod,
          scales: updatedScales,
        };
      });

      // Synchronize in real-time with parent state and localStorage
      onUpdatePresets(updated);
      return updated;
    });
  };

  // Handler to update specific Cost Breakdown (HH, HM, GGF) for a stage in a scale
  const handleUpdateCostBreakdown = (
    scaleName: string,
    stageId: string,
    field: keyof StageCostBreakdown,
    value: number
  ) => {
    const validVal = Math.max(0, Math.round(value));

    setLocalPresets((prev) => {
      const updated = prev.map((prod) => {
        if (prod.id !== currentPreset.id) return prod;

        const allScales = ensureAllProductScales(prod, customScales);
        const updatedScales = allScales.map((s) => {
          if (
            s.scaleName.toLowerCase() === scaleName.toLowerCase() ||
            s.scaleId.toLowerCase() === scaleName.toLowerCase() ||
            s.scaleName.toLowerCase().replace(/[^0-9a-z]/g, '') === scaleName.toLowerCase().replace(/[^0-9a-z]/g, '')
          ) {
            const currentMin = s.stagesStandardMin?.[stageId] || 60;
            const currentBreakdown = s.setupCostBreakdown?.[stageId] || getDefaultStageCostBreakdown(currentMin);
            const newBreakdown: StageCostBreakdown = {
              ...currentBreakdown,
              [field]: validVal,
            };

            return {
              ...s,
              setupCostBreakdown: {
                ...(s.setupCostBreakdown || {}),
                [stageId]: newBreakdown,
              },
            };
          }
          return s;
        });

        return {
          ...prod,
          scales: updatedScales,
        };
      });

      onUpdatePresets(updated);
      return updated;
    });
  };

  // Quick preset adjust (+15, +30, -15, etc.)
  const handleQuickAdjust = (scaleName: string, stageId: string, deltaMin: number) => {
    const scaleConfig = presetScales.find((s) => s.scaleName.toLowerCase() === scaleName.toLowerCase());
    const currentVal =
      scaleConfig?.stagesStandardMin?.[stageId] ||
      customStages.find((st) => st.id === stageId)?.defaultStandardMin ||
      60;
    handleUpdateStandardMin(scaleName, stageId, Math.max(5, currentVal + deltaMin));
  };

  // Copy standards from one scale to another
  const handleCopyScale = (fromScaleName: string, toScaleName: string) => {
    const sourceScale = presetScales.find(
      (s) => s.scaleName.toLowerCase() === fromScaleName.toLowerCase() || s.scaleId.toLowerCase() === fromScaleName.toLowerCase()
    );
    if (!sourceScale) return;

    setLocalPresets((prev) => {
      const updated = prev.map((prod) => {
        if (prod.id !== currentPreset.id) return prod;
        const allScales = ensureAllProductScales(prod, customScales);
        const updatedScales = allScales.map((s) => {
          if (
            s.scaleName.toLowerCase() === toScaleName.toLowerCase() ||
            s.scaleId.toLowerCase() === toScaleName.toLowerCase()
          ) {
            return {
              ...s,
              stagesStandardMin: { ...sourceScale.stagesStandardMin },
              setupCostBreakdown: { ...(sourceScale.setupCostBreakdown || {}) },
            };
          }
          return s;
        });
        return { ...prod, scales: updatedScales };
      });

      onUpdatePresets(updated);
      return updated;
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Save all changes
  const handleSaveAll = () => {
    onUpdatePresets(localPresets);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Reset to default presets
  const handleResetToDefaults = () => {
    if (window.confirm('Deseja restaurar todos os produtos e standards para os valores padrão de fábrica?')) {
      setLocalPresets(PRODUCT_PRESETS);
      onUpdatePresets(PRODUCT_PRESETS);
      setSelectedPresetId(PRODUCT_PRESETS[0].id);
      setCustomScales(DEFAULT_PRODUCTION_SCALES);
      setCustomStages(PROCESS_STAGES);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  // Create New Product
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    const newId = `prod-${Date.now()}`;
    const initialScales: ScaleStandardConfig[] = customScales.map((scale) => ({
      scaleId: scale.id,
      scaleName: scale.name,
      volumeLiters: scale.volumeLiters,
      stagesStandardMin: {
        setup: scale.volumeLiters <= 500 ? 35 : 60,
        abastecimento: scale.volumeLiters <= 500 ? 25 : 45,
        preparo: scale.volumeLiters <= 500 ? 50 : 90,
        multiplicacao: scale.volumeLiters <= 500 ? 480 : 720,
      },
    }));

    const newProduct: ProductPreset = {
      id: newId,
      code: newProdCode.trim() || `REC-${String(localPresets.length + 1).padStart(2, '0')}`,
      name: newProdName.trim(),
      description: newProdDesc.trim() || 'Nova formulação biotecnológica.',
      volumeLiters: 5000,
      scales: initialScales,
      stagesStandardMin: initialScales[initialScales.length - 1]?.stagesStandardMin,
    };

    const updated = [...localPresets, newProduct];
    setLocalPresets(updated);
    onUpdatePresets(updated);
    setSelectedPresetId(newId);
    setIsNewProductModalOpen(false);
    setNewProdName('');
    setNewProdCode('');
    setNewProdDesc('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Edit Product Info
  const handleOpenEditProduct = () => {
    if (!currentPreset) return;
    setEditProdName(currentPreset.name);
    setEditProdCode(currentPreset.code || '');
    setEditProdDesc(currentPreset.description);
    setIsEditProductModalOpen(true);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProdName.trim()) return;

    const updated = localPresets.map((p) =>
      p.id === currentPreset.id
        ? {
            ...p,
            name: editProdName.trim(),
            code: editProdCode.trim(),
            description: editProdDesc.trim(),
          }
        : p
    );

    setLocalPresets(updated);
    onUpdatePresets(updated);
    setIsEditProductModalOpen(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Delete Product
  const handleDeleteProduct = (id: string) => {
    if (localPresets.length <= 1) {
      setProductDeleteAlert('Você deve manter pelo menos um produto cadastrado no sistema.');
      return;
    }
    const target = localPresets.find((p) => p.id === id) || currentPreset;
    if (target) {
      setProductToDelete(target);
    }
  };

  // Create New Scale
  const handleCreateScale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScaleName.trim()) return;

    const scaleNameClean = newScaleName.trim().toUpperCase();
    const newScaleId = `scale-${Date.now()}`;
    const newScaleObj: ProductionScale = {
      id: newScaleId,
      name: scaleNameClean,
      volumeLiters: Number(newScaleVolume) || 1000,
      description: `Escala de Produção ${scaleNameClean}`,
    };

    setCustomScales((prev) => [...prev, newScaleObj]);

    // Add this new scale to all products
    const updatedPresets = localPresets.map((prod) => {
      const currentScales = prod.scales || [];
      if (currentScales.some((s) => s.scaleName === scaleNameClean)) return prod;

      const fallbackMin = currentScales[0]?.stagesStandardMin || {
        setup: 60,
        abastecimento: 45,
        preparo: 90,
        multiplicacao: 720,
      };

      const newScaleConfig: ScaleStandardConfig = {
        scaleId: newScaleId,
        scaleName: scaleNameClean,
        volumeLiters: Number(newScaleVolume) || 1000,
        stagesStandardMin: { ...fallbackMin },
      };

      return {
        ...prod,
        scales: [...currentScales, newScaleConfig],
      };
    });

    setLocalPresets(updatedPresets);
    onUpdatePresets(updatedPresets);
    setActiveScaleTab(scaleNameClean);
    setIsNewScaleModalOpen(false);
    setNewScaleName('');
    setNewScaleVolume(10000);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Create New Stage
  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    const newStageId = newStageName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newSeq = customStages.length + 1;
    const newStageDef: StageDefinition = {
      id: newStageId,
      label: `${newSeq}. ${newStageName.trim()}`,
      shortLabel: newStageName.trim(),
      defaultStandardMin: Number(newStageDefaultMin) || 60,
      description: newStageDesc.trim() || 'Etapa personalizada de bioprocesso',
      badgeColor: 'purple',
      sequence: newSeq,
    };

    const updatedStages = [...customStages, newStageDef];
    setCustomStages(updatedStages);

    // Add this stage default to all scales of all products
    const updatedPresets = localPresets.map((prod) => {
      const updatedScales = (prod.scales || []).map((scale) => ({
        ...scale,
        stagesStandardMin: {
          ...scale.stagesStandardMin,
          [newStageId]: Number(newStageDefaultMin) || 60,
        },
      }));
      return {
        ...prod,
        scales: updatedScales,
      };
    });

    setLocalPresets(updatedPresets);
    onUpdatePresets(updatedPresets);
    setIsNewStageModalOpen(false);
    setNewStageName('');
    setNewStageDefaultMin(60);
    setNewStageDesc('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sliders className="w-4 h-4" />
            <span>Engenharia de Bioprocessos</span>
            <span>•</span>
            <span>Standards & Escalas</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Configuração de Tempos Standards por Escala
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Defina o tempo standard de cada etapa de acordo com o produto e a escala do biorreator (100L, 500L, 3000L, 5000L).
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewLayout('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
                viewLayout === 'matrix'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Matriz Geral</span>
            </button>
            <button
              onClick={() => setViewLayout('by_scale')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
                viewLayout === 'by_scale'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Por Escala</span>
            </button>
          </div>

          <button
            onClick={handleResetToDefaults}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center space-x-1.5"
            title="Restaurar valores padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Padrões Originais</span>
          </button>

          <button
            onClick={handleSaveAll}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-950/50 transition flex items-center space-x-2 active:scale-95 cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-bounce" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </>
            )}
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

      {/* Security & Lock Notification Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-200">Segurança de Standards Ativada: </span>
            <span>
              Os tempos configurados nesta tela são bloqueados nas demais telas (Grade Operacional e Apontamento de Bateladas) para evitar desvios não autorizados.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsNewScaleModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nova Escala</span>
          </button>
          <button
            onClick={() => setIsNewStageModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nova Etapa</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Products Bar, Right Standards Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-cyan-400" />
                <span>Produtos Cadastrados</span>
              </h2>
              <button
                onClick={() => setIsNewProductModalOpen(true)}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Produto</span>
              </button>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Product List Cards */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredPresets.map((prod) => {
                const isSelected = prod.id === currentPreset?.id;
                const scalesCount = prod.scales?.length || 4;

                return (
                  <div
                    key={prod.id}
                    onClick={() => setSelectedPresetId(prod.id)}
                    className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/20'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                            {prod.code || 'REC-01'}
                          </span>
                          <h3 className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {prod.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{prod.description}</p>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Layers className="w-3 h-3 text-slate-500" />
                        {scalesCount} Escalas (100L a 5000L)
                      </span>
                      <span className="text-emerald-400 font-medium">Standards Ativos</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Standards Matrix / Scale Editor */}
        <div className="lg:col-span-8 space-y-4">
          {currentPreset && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              {/* Product Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
                    {currentPreset.code?.split('-')[1] || 'REC'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-white">{currentPreset.name}</h2>
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {currentPreset.code || 'REC-01'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{currentPreset.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleOpenEditProduct}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Produto</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(currentPreset.id)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg text-xs border border-rose-500/20 transition"
                    title="Excluir produto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* View 1: Matriz Geral (Table of All Scales x All Stages) */}
              {viewLayout === 'matrix' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-cyan-400" />
                      Matriz de Standards e Setup por Escala (HH, HM, GGF)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]">
                        <strong>HH:</strong> Hora Homem
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px]">
                        <strong>HM:</strong> Hora Máquina
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px]">
                        <strong>GGF:</strong> Gastos Gerais
                      </span>
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-inner">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-300 font-semibold">
                          <th className="py-3 px-4 font-bold">Etapas de Produção</th>
                          {presetScales.map((scale) => (
                            <th key={scale.scaleName} className="py-3 px-3 text-center min-w-[190px]">
                              <div className="flex flex-col items-center">
                                <span className="text-cyan-400 font-mono font-bold text-xs bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                  {scale.scaleName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                                  {scale.volumeLiters} Litros
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {customStages.map((stage) => (
                          <tr key={stage.id} className="hover:bg-slate-900/40 transition-colors">
                            {/* Stage Info */}
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-200">{stage.label}</div>
                              <div className="text-[11px] text-slate-400 line-clamp-1">{stage.description}</div>
                              <span className="inline-block mt-1 text-[9px] font-mono text-cyan-400/80 bg-cyan-950/40 px-1.5 py-0.2 rounded border border-cyan-800/40">
                                Setup / Ciclo
                              </span>
                            </td>

                            {/* Standard inputs for each scale with HH, HM, GGF breakdown */}
                            {presetScales.map((scale) => {
                              const stdMin =
                                scale.stagesStandardMin?.[stage.id] ?? stage.defaultStandardMin;
                              const breakdown =
                                scale.setupCostBreakdown?.[stage.id] ||
                                getDefaultStageCostBreakdown(stdMin);

                              return (
                                <td key={scale.scaleName} className="py-2.5 px-3 text-center">
                                  <div className="flex flex-col items-center">
                                    {/* HH, HM, GGF independent fixed standards */}
                                    <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 w-full max-w-[200px]">
                                      <div className="flex flex-col items-center" title="Hora Homem Padrão (Minutos)">
                                        <span className="text-[9px] font-bold text-blue-400 font-mono mb-0.5">HH</span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="5000"
                                          value={breakdown.hhMin}
                                          onChange={(e) =>
                                            handleUpdateCostBreakdown(
                                              scale.scaleName,
                                              stage.id,
                                              'hhMin',
                                              parseInt(e.target.value, 10) || 0
                                            )
                                          }
                                          className="w-full bg-slate-950 border border-blue-900/60 focus:border-blue-400 rounded px-1 py-1 text-center font-mono font-bold text-xs text-blue-200"
                                        />
                                      </div>

                                      <div className="flex flex-col items-center" title="Hora Máquina Padrão (Minutos)">
                                        <span className="text-[9px] font-bold text-amber-400 font-mono mb-0.5">HM</span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="5000"
                                          value={breakdown.hmMin}
                                          onChange={(e) =>
                                            handleUpdateCostBreakdown(
                                              scale.scaleName,
                                              stage.id,
                                              'hmMin',
                                              parseInt(e.target.value, 10) || 0
                                            )
                                          }
                                          className="w-full bg-slate-950 border border-amber-900/60 focus:border-amber-400 rounded px-1 py-1 text-center font-mono font-bold text-xs text-amber-200"
                                        />
                                      </div>

                                      <div className="flex flex-col items-center" title="Gastos Gerais de Fabricação Padrão (Minutos)">
                                        <span className="text-[9px] font-bold text-purple-400 font-mono mb-0.5">GGF</span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="5000"
                                          value={breakdown.ggfMin}
                                          onChange={(e) =>
                                            handleUpdateCostBreakdown(
                                              scale.scaleName,
                                              stage.id,
                                              'ggfMin',
                                              parseInt(e.target.value, 10) || 0
                                            )
                                          }
                                          className="w-full bg-slate-950 border border-purple-900/60 focus:border-purple-400 rounded px-1 py-1 text-center font-mono font-bold text-xs text-purple-200"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}

                        {/* Total Row */}
                        <tr className="bg-slate-900/80 font-bold border-t-2 border-slate-700">
                          <td className="py-3 px-4 text-white uppercase tracking-wider text-[11px]">
                            Tempo Total Estimado da Batelada
                          </td>
                          {presetScales.map((scale) => {
                            let totalMin = 0;
                            let totalHh = 0;
                            let totalHm = 0;
                            let totalGgf = 0;

                            customStages.forEach((st) => {
                              const sMin = scale.stagesStandardMin?.[st.id] ?? st.defaultStandardMin;
                              const b = scale.setupCostBreakdown?.[st.id] || getDefaultStageCostBreakdown(sMin);
                              totalMin += sMin;
                              totalHh += b.hhMin;
                              totalHm += b.hmMin;
                              totalGgf += b.ggfMin;
                            });

                            return (
                              <td key={scale.scaleName} className="py-3 px-3 text-center font-mono">
                                <div className="text-xs text-white font-bold">{totalMin} min</div>
                                <div className="text-[11px] text-emerald-400 font-semibold mb-1">
                                  {formatMinutes(totalMin, true)}
                                </div>
                                <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-300 font-normal">
                                  <span className="text-blue-300 font-semibold">HH: {totalHh}m</span>
                                  <span>•</span>
                                  <span className="text-amber-300 font-semibold">HM: {totalHm}m</span>
                                  <span>•</span>
                                  <span className="text-purple-300 font-semibold">GGF: {totalGgf}m</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* View 2: Por Escala (Tabbed view for each scale) */
                <div className="space-y-4">
                  {/* Scale Selector Tabs */}
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
                    {presetScales.map((scale) => {
                      const isActive = scale.scaleName === activeScaleTab;
                      return (
                        <button
                          key={scale.scaleName}
                          onClick={() => setActiveScaleTab(scale.scaleName)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 ${
                            isActive
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          <Gauge className="w-3.5 h-3.5" />
                          <span>Escala {scale.scaleName}</span>
                          <span className="text-[10px] font-mono opacity-80">({scale.volumeLiters}L)</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Scale Details & Stage Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {customStages.map((stage) => {
                      const activeScaleConfig = presetScales.find((s) => s.scaleName === activeScaleTab);
                      const stdMin =
                        activeScaleConfig?.stagesStandardMin?.[stage.id] ?? stage.defaultStandardMin;
                      const breakdown =
                        activeScaleConfig?.setupCostBreakdown?.[stage.id] ||
                        getDefaultStageCostBreakdown(stdMin);

                      return (
                        <div
                          key={stage.id}
                          className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition shadow-inner"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-cyan-400" />
                              {stage.label}
                            </h4>
                            <span className="text-xs font-mono text-emerald-400 font-bold">
                              {formatMinutes(stdMin)} ({stdMin} min)
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400">{stage.description}</p>

                          {/* HH, HM, GGF inputs for this stage */}
                          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                              Detalhamento de Setup & Custos
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] text-blue-400 font-bold font-mono block mb-0.5">
                                  Hora Homem (HH)
                                </label>
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={breakdown.hhMin}
                                    onChange={(e) =>
                                      handleUpdateCostBreakdown(
                                        activeScaleTab,
                                        stage.id,
                                        'hhMin',
                                        parseInt(e.target.value, 10) || 0
                                      )
                                    }
                                    className="w-full bg-slate-950 border border-blue-900/60 focus:border-blue-400 rounded px-2 py-1 text-xs font-mono font-bold text-blue-200 text-center"
                                  />
                                  <span className="text-[10px] text-slate-500 font-mono">m</span>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] text-amber-400 font-bold font-mono block mb-0.5">
                                  Hora Máquina (HM)
                                </label>
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={breakdown.hmMin}
                                    onChange={(e) =>
                                      handleUpdateCostBreakdown(
                                        activeScaleTab,
                                        stage.id,
                                        'hmMin',
                                        parseInt(e.target.value, 10) || 0
                                      )
                                    }
                                    className="w-full bg-slate-950 border border-amber-900/60 focus:border-amber-400 rounded px-2 py-1 text-xs font-mono font-bold text-amber-200 text-center"
                                  />
                                  <span className="text-[10px] text-slate-500 font-mono">m</span>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] text-purple-400 font-bold font-mono block mb-0.5">
                                  GGF (Min)
                                </label>
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={breakdown.ggfMin}
                                    onChange={(e) =>
                                      handleUpdateCostBreakdown(
                                        activeScaleTab,
                                        stage.id,
                                        'ggfMin',
                                        parseInt(e.target.value, 10) || 0
                                      )
                                    }
                                    className="w-full bg-slate-950 border border-purple-900/60 focus:border-purple-400 rounded px-2 py-1 text-xs font-mono font-bold text-purple-200 text-center"
                                  />
                                  <span className="text-[10px] text-slate-500 font-mono">m</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Informação sobre os padrões fixos */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400 font-mono">
                            <span>Status: Definido por Etapa</span>
                            <span className="text-cyan-400 font-semibold">Regra 2 (Tempo Fixo)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Copy Standard Tool */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      Copiar standards de <strong>{activeScaleTab}</strong> para outra escala:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {presetScales
                        .filter((s) => s.scaleName !== activeScaleTab)
                        .map((targetScale) => (
                          <button
                            key={targetScale.scaleName}
                            onClick={() => handleCopyScale(activeScaleTab, targetScale.scaleName)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white rounded-lg text-xs font-mono font-semibold transition"
                          >
                            → {targetScale.scaleName}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Product */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Cadastrar Novo Produto
              </h3>
              <button
                onClick={() => setIsNewProductModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: BioFertil Turbo, Trichoderma Forte..."
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Código da Receita / Fórmula</label>
                <input
                  type="text"
                  placeholder="Ex: REC-BIO-06"
                  value={newProdCode}
                  onChange={(e) => setNewProdCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descrição Técnica</label>
                <textarea
                  rows={2}
                  placeholder="Descrição do inóculo, microrganismo ou aplicação agrícola..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-slate-300 text-[11px]">
                <p>
                  O novo produto será inicializado automaticamente com as escalas <strong>100L, 500L, 3000L e 5000L</strong> para você customizar os standards.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-950 transition"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Product */}
      {isEditProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                Editar Dados do Produto
              </h3>
              <button
                onClick={() => setIsEditProductModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Código da Receita</label>
                <input
                  type="text"
                  value={editProdCode}
                  onChange={(e) => setEditProdCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editProdDesc}
                  onChange={(e) => setEditProdDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow transition"
                >
                  Atualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Scale */}
      {isNewScaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Cadastrar Nova Escala de Biorreator
              </h3>
              <button
                onClick={() => setIsNewScaleModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateScale} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome da Escala *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 10000L, 250L, 15000L..."
                  value={newScaleName}
                  onChange={(e) => setNewScaleName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Volume Nominal (Litros)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newScaleVolume}
                  onChange={(e) => setNewScaleVolume(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewScaleModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow transition"
                >
                  Adicionar Escala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Stage */}
      {isNewStageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Cadastrar Nova Etapa de Processo
              </h3>
              <button
                onClick={() => setIsNewStageModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStage} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome da Etapa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Inoculação, Filtração Tangencial, Inativação..."
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tempo Standard Padrão (minutos)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newStageDefaultMin}
                  onChange={(e) => setNewStageDefaultMin(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descrição Operacional</label>
                <textarea
                  rows={2}
                  placeholder="Procedimento ou checklist desta etapa..."
                  value={newStageDesc}
                  onChange={(e) => setNewStageDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewStageModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow transition"
                >
                  Adicionar Etapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Alert modal if only 1 product remains */}
      {productDeleteAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Atenção</h3>
            <p className="text-xs text-slate-300">{productDeleteAlert}</p>
            <button
              onClick={() => setProductDeleteAlert(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Product from Standards */}
      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={() => {
          if (!productToDelete) return;
          const updated = localPresets.filter((p) => p.id !== productToDelete.id);
          setLocalPresets(updated);
          onUpdatePresets(updated);
          if (selectedPresetId === productToDelete.id) {
            setSelectedPresetId(updated[0]?.id || '');
          }
          setProductToDelete(null);
        }}
        title="Excluir Produto e Standards"
        itemName={productToDelete ? `${productToDelete.name} (${productToDelete.code || 'REC'})` : undefined}
        message="Deseja realmente excluir esta formulação de produto e todas as suas configurações de escalas e tempos standard?"
        confirmLabel="Confirmar Exclusão"
      />
    </div>
  );
};
