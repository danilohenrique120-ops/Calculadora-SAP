import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OperationalGrid } from './components/OperationalGrid';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { StandardsManager } from './components/StandardsManager';
import { CostDriverRulesManager } from './components/CostDriverRulesManager';
import { RegistrationManager } from './components/RegistrationManager';
import { OrderFormModal } from './components/OrderFormModal';
import { ProductionOrder, ProductPreset, BioreactorItem, OperatorItem, CostDriverRule, VarianceThresholdConfig, DEFAULT_COST_DRIVER_RULES } from './types';
import { INITIAL_MOCK_ORDERS, PRODUCT_PRESETS, INITIAL_BIOREACTORS, INITIAL_OPERATORS } from './utils/mockData';
import { exportOrdersToCSV, exportOrdersToJSON } from './utils/export';
import {
  normalizeProductPresets,
  normalizeProductionOrder,
  getStoredCostDriverRules,
  saveStoredCostDriverRules,
  getStoredVarianceThresholds,
  saveStoredVarianceThresholds,
} from './utils/calculations';
import { ConfirmModal } from './components/ConfirmModal';
import { PasswordModal } from './components/PasswordModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CheckCircle2 } from 'lucide-react';
import {
  seedDatabaseIfEmpty,
  subscribeToOrders,
  subscribeToPresets,
  subscribeToBioreactors,
  subscribeToOperators,
  subscribeToDriverRules,
  subscribeToVarianceThresholds,
  dbSaveOrder,
  dbDeleteOrder,
  dbClearAllOrders,
  syncLocalOrdersToCloudIfMissing,
  syncAllBioreactors,
  syncAllOperators,
  syncAllPresets,
  dbSaveDriverRules,
  dbSaveVarianceThresholds,
  dbResetAllToDefaults,
} from './lib/firebase';

const STORAGE_KEY_ORDERS = 'biotime_orders_v2';
const STORAGE_KEY_PRESETS = 'biotime_presets_v2';
const STORAGE_KEY_BIOREACTORS = 'biotime_bioreactors_v2';
const STORAGE_KEY_OPERATORS = 'biotime_operators_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<'grid' | 'analytics' | 'cadastros' | 'standards' | 'drivers'>('grid');
  const [isCloudConnected, setIsCloudConnected] = useState(true);

  // Password Protection for Admin tabs ('cadastros', 'standards', 'drivers')
  const [isAuthenticatedAdmin, setIsAuthenticatedAdmin] = useState(false);
  const [pendingProtectedTab, setPendingProtectedTab] = useState<'cadastros' | 'standards' | 'drivers' | null>(null);

  // Variance Thresholds (Red / Amber / Green traffic light system)
  const [varianceThresholds, setVarianceThresholds] = useState<VarianceThresholdConfig>(() => {
    return getStoredVarianceThresholds();
  });

  const handleUpdateVarianceThresholds = (updated: VarianceThresholdConfig) => {
    setVarianceThresholds(updated);
    saveStoredVarianceThresholds(updated);
    dbSaveVarianceThresholds(updated).catch((err) => console.error('Cloud threshold error:', err));
    showToast('Configuração de faixas do semáforo atualizada na nuvem!');
  };

  // Driver Rules State (HH, HM, GGF formulas)
  const [driverRules, setDriverRules] = useState<CostDriverRule[]>(() => {
    return getStoredCostDriverRules();
  });

  const handleUpdateDriverRules = (updatedRules: CostDriverRule[]) => {
    setDriverRules(updatedRules);
    saveStoredCostDriverRules(updatedRules);
    dbSaveDriverRules(updatedRules).catch((err) => console.error('Cloud rules error:', err));
  };

  // Tab switch interceptor
  const handleTabSelect = (tab: 'grid' | 'analytics' | 'cadastros' | 'standards' | 'drivers') => {
    if ((tab === 'cadastros' || tab === 'standards' || tab === 'drivers') && !isAuthenticatedAdmin) {
      setPendingProtectedTab(tab);
    } else {
      setActiveTab(tab);
    }
  };

  const handlePasswordSuccess = () => {
    setIsAuthenticatedAdmin(true);
    if (pendingProtectedTab) {
      setActiveTab(pendingProtectedTab);
      setPendingProtectedTab(null);
    }
    showToast('Acesso liberado com sucesso!');
  };

  const handleLockAdmin = () => {
    setIsAuthenticatedAdmin(false);
    setActiveTab('grid');
    showToast('Painéis administrativos bloqueados com sucesso!', 'info');
  };

  // Orders State (Pure single source of truth from Firestore with normalized schema)
  const [orders, setOrders] = useState<ProductionOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeProductionOrder);
        }
      }
    } catch (e) {
      console.error('Failed to load cached orders', e);
    }
    return [];
  });

  // Presets / Products State (always normalized to guarantee all scales exist)
  const [presets, setPresets] = useState<ProductPreset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRESETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeProductPresets(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load presets', e);
    }
    return normalizeProductPresets(PRODUCT_PRESETS);
  });

  // Bioreactors / Equipments State
  const [bioreactors, setBioreactors] = useState<BioreactorItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BIOREACTORS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load bioreactors', e);
    }
    return INITIAL_BIOREACTORS;
  });

  // Operators / People State
  const [operators, setOperators] = useState<OperatorItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPERATORS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load operators', e);
    }
    return INITIAL_OPERATORS;
  });

  // Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Real-time Firestore Subscriptions & Auto-seed
  useEffect(() => {
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribePresets: (() => void) | undefined;
    let unsubscribeBios: (() => void) | undefined;
    let unsubscribeOps: (() => void) | undefined;
    let unsubscribeRules: (() => void) | undefined;
    let unsubscribeThresholds: (() => void) | undefined;

    const initFirebase = () => {
      try {
        setIsCloudConnected(true);

        // Run baseline seed in background if uninitialized, without blocking listeners
        seedDatabaseIfEmpty().catch((err) => console.error('Cloud seed background error:', err));

        unsubscribeOrders = subscribeToOrders(
          (cloudOrders) => {
            if (Array.isArray(cloudOrders)) {
              const normalized = cloudOrders.map(normalizeProductionOrder);
              setOrders(normalized);
              try {
                localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(normalized));
              } catch {}
            }
            setIsCloudConnected(true);
          },
          (err) => {
            console.error('Orders sync error:', err);
            setIsCloudConnected(false);
          }
        );

        unsubscribePresets = subscribeToPresets(
          (cloudPresets) => {
            if (Array.isArray(cloudPresets)) {
              setPresets(normalizeProductPresets(cloudPresets));
            }
          },
          (err) => console.error('Presets sync error:', err)
        );

        unsubscribeBios = subscribeToBioreactors(
          (cloudBios) => {
            if (Array.isArray(cloudBios)) {
              setBioreactors(cloudBios);
            }
          },
          (err) => console.error('Bioreactors sync error:', err)
        );

        unsubscribeOps = subscribeToOperators(
          (cloudOps) => {
            if (Array.isArray(cloudOps)) {
              setOperators(cloudOps);
            }
          },
          (err) => console.error('Operators sync error:', err)
        );

        unsubscribeRules = subscribeToDriverRules(
          (cloudRules) => {
            if (Array.isArray(cloudRules) && cloudRules.length > 0) {
              setDriverRules(cloudRules);
              saveStoredCostDriverRules(cloudRules);
            }
          },
          (err) => console.error('Driver rules sync error:', err)
        );

        unsubscribeThresholds = subscribeToVarianceThresholds(
          (cloudThresholds) => {
            if (cloudThresholds) {
              setVarianceThresholds(cloudThresholds);
              saveStoredVarianceThresholds(cloudThresholds);
            }
          },
          (err) => console.error('Variance thresholds sync error:', err)
        );
      } catch (err) {
        console.error('Firebase initialization error:', err);
        setIsCloudConnected(false);
      }
    };

    initFirebase();

    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribePresets) unsubscribePresets();
      if (unsubscribeBios) unsubscribeBios();
      if (unsubscribeOps) unsubscribeOps();
      if (unsubscribeRules) unsubscribeRules();
      if (unsubscribeThresholds) unsubscribeThresholds();
    };
  }, []);

  // Sync to localStorage as backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders', e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
    } catch (e) {
      console.error('Failed to save presets', e);
    }
  }, [presets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BIOREACTORS, JSON.stringify(bioreactors));
    } catch (e) {
      console.error('Failed to save bioreactors', e);
    }
  }, [bioreactors]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OPERATORS, JSON.stringify(operators));
    } catch (e) {
      console.error('Failed to save operators', e);
    }
  }, [operators]);

  // Handlers with Realtime Cloud Sync
  const handleUpdateBioreactors = (newBios: BioreactorItem[]) => {
    setBioreactors(newBios);
    syncAllBioreactors(newBios);
  };

  const handleUpdateOperators = (newOps: OperatorItem[]) => {
    setOperators(newOps);
    syncAllOperators(newOps);
  };

  const handleUpdateProducts = (newProducts: ProductPreset[]) => {
    const normalized = normalizeProductPresets(newProducts);
    setPresets(normalized);
    syncAllPresets(normalized);
  };

  // Order Handlers
  const handleSaveOrder = async (savedOrder: ProductionOrder) => {
    const normalized = normalizeProductionOrder(savedOrder);
    setOrders((prev) => {
      const existsIndex = prev.findIndex((o) => o.id === normalized.id);
      if (existsIndex >= 0) {
        const next = [...prev];
        next[existsIndex] = normalized;
        return next;
      }
      return [normalized, ...prev];
    });

    try {
      await dbSaveOrder(normalized);
      setIsCloudConnected(true);
      showToast(`Ordem de Produção ${normalized.opNumber} salva e sincronizada na nuvem!`);
    } catch (err: any) {
      console.error('Error saving order to Firestore:', err);
      setIsCloudConnected(false);
      showToast(`Erro ao salvar na nuvem: ${err?.message || 'Verifique sua conexão'}`, 'info');
    }
  };

  const handleUpdateOrder = async (updatedOrder: ProductionOrder) => {
    const normalized = normalizeProductionOrder(updatedOrder);
    setOrders((prev) => prev.map((o) => (o.id === normalized.id ? normalized : o)));
    try {
      await dbSaveOrder(normalized);
      setIsCloudConnected(true);
    } catch (err: any) {
      console.error('Error updating order to Firestore:', err);
      setIsCloudConnected(false);
    }
  };

  const handleDeleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    dbDeleteOrder(id).catch((err) => {
      console.error('Error deleting order from Firestore:', err);
    });
    showToast('Ordem de produção excluída da nuvem.', 'info');
  };

  const handleDuplicateOrder = (sourceOrder: ProductionOrder) => {
    const nextNum = orders.length + 1;
    const year = new Date().getFullYear();
    const duplicated: ProductionOrder = {
      ...sourceOrder,
      id: `ord-${Date.now()}`,
      opNumber: `OP-${year}-${String(nextNum).padStart(3, '0')}`,
      prepDate: new Date().toISOString().split('T')[0],
      status: 'em_andamento',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: `Duplicada a partir de ${sourceOrder.opNumber}`,
    };
    setOrders((prev) => [duplicated, ...prev]);
    dbSaveOrder(duplicated).catch((err) => {
      console.error('Error saving duplicated order:', err);
    });
    showToast(`Ordem duplicada com sucesso como ${duplicated.opNumber}!`);
  };

  const handleOpenNewOrder = () => {
    setEditingOrder(null);
    setIsOrderModalOpen(true);
  };

  const handleOpenEditOrder = (order: ProductionOrder) => {
    setEditingOrder(order);
    setIsOrderModalOpen(true);
  };

  const handleLoadMockData = async () => {
    await dbResetAllToDefaults();
    setOrders(INITIAL_MOCK_ORDERS);
    setPresets(normalizeProductPresets(PRODUCT_PRESETS));
    setBioreactors(INITIAL_BIOREACTORS);
    setOperators(INITIAL_OPERATORS);
    setDriverRules(DEFAULT_COST_DRIVER_RULES);
    saveStoredCostDriverRules(DEFAULT_COST_DRIVER_RULES);
    showToast('Banco de dados em nuvem restaurado para os padrões!');
  };

  const handleResetData = () => {
    setResetConfirmOpen(true);
  };

  const handleExportCSV = () => {
    exportOrdersToCSV(orders, 'ordens_de_producao_biorreatores.csv', driverRules);
    showToast('Planilha CSV gerada para download!');
  };

  const handleExportJSON = () => {
    exportOrdersToJSON(orders);
    showToast('Backup JSON exportado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header & SCADA Navigation */}
      <ErrorBoundary fallbackTitle="Erro ao carregar cabeçalho">
        <Header
          activeTab={activeTab}
          setActiveTab={handleTabSelect}
          orders={orders}
          isAuthenticatedAdmin={isAuthenticatedAdmin}
          onLockAdmin={handleLockAdmin}
          isCloudConnected={isCloudConnected}
          onNewOrder={handleOpenNewOrder}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          onLoadMockData={handleLoadMockData}
          onResetData={handleResetData}
          onOpenPresets={() => handleTabSelect('standards')}
        />
      </ErrorBoundary>

      {/* Main View Container */}
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-5">
        <ErrorBoundary fallbackTitle="Erro ao carregar visualização">
          {activeTab === 'grid' && (
            <OperationalGrid
              orders={orders}
              onUpdateOrder={handleUpdateOrder}
              onDeleteOrder={handleDeleteOrder}
              onDuplicateOrder={handleDuplicateOrder}
              onEditOrderModal={handleOpenEditOrder}
              onNewOrder={handleOpenNewOrder}
              bioreactors={bioreactors}
              operators={operators}
              products={presets}
              driverRules={driverRules}
              varianceThresholds={varianceThresholds}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              orders={orders}
              bioreactors={bioreactors}
              operators={operators}
              products={presets}
              driverRules={driverRules}
              varianceThresholds={varianceThresholds}
              isAuthenticatedAdmin={isAuthenticatedAdmin}
              onAuthenticateAdmin={() => setIsAuthenticatedAdmin(true)}
            />
          )}

          {activeTab === 'cadastros' && (
            <RegistrationManager
              bioreactors={bioreactors}
              operators={operators}
              products={presets}
              onUpdateBioreactors={handleUpdateBioreactors}
              onUpdateOperators={handleUpdateOperators}
              onUpdateProducts={handleUpdateProducts}
              onLockAdmin={handleLockAdmin}
            />
          )}

          {activeTab === 'standards' && (
            <StandardsManager
              presets={presets}
              onUpdatePresets={handleUpdateProducts}
              bioreactors={bioreactors}
              onLockAdmin={handleLockAdmin}
            />
          )}

          {activeTab === 'drivers' && (
            <CostDriverRulesManager
              driverRules={driverRules}
              onUpdateDriverRules={handleUpdateDriverRules}
              varianceThresholds={varianceThresholds}
              onUpdateVarianceThresholds={handleUpdateVarianceThresholds}
              onLockAdmin={handleLockAdmin}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Order Modal (Create / Edit) */}
      <OrderFormModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
        initialOrder={editingOrder}
        existingOrders={orders}
        bioreactors={bioreactors}
        operators={operators}
        products={presets}
        driverRules={driverRules}
        varianceThresholds={varianceThresholds}
      />

      {/* Confirmation Modal for Resetting All Batches */}
      <ConfirmModal
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await dbClearAllOrders();
            setOrders([]);
            setResetConfirmOpen(false);
            showToast('Todas as bateladas foram removidas da nuvem com sucesso.', 'info');
          } catch (err) {
            console.error('Erro ao resetar bateladas na nuvem:', err);
            showToast('Erro ao remover bateladas da nuvem.', 'info');
          }
        }}
        title="Resetar Todas as Bateladas"
        message="Tem certeza que deseja limpar todas as ordens de produção e apontamentos na nuvem? Os cadastros de biorreatores, operadores e padrões de tempos serão preservados."
        confirmLabel="Limpar Bateladas"
      />

      {/* Password Protection Modal for Admin / Config tabs */}
      <PasswordModal
        isOpen={pendingProtectedTab !== null}
        onClose={() => setPendingProtectedTab(null)}
        onSuccess={handlePasswordSuccess}
        targetTitle={
          pendingProtectedTab === 'cadastros'
            ? 'Cadastros (Equipamentos / Pessoas / Produtos)'
            : pendingProtectedTab === 'standards'
            ? 'Padrões de Engenharia (Standards)'
            : 'Critérios de Custos (HH / HM / GGF)'
        }
      />
    </div>
  );
}
